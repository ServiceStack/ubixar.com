#!/bin/bash

# PostgreSQL Backup Restore Script for Kamal
# This script runs locally and executes restore commands in the backup container

set -e

# Function to log messages with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to show usage
show_usage() {
    echo "PostgreSQL Backup Restore Tool for Kamal"
    echo ""
    echo "Usage: $0 [backup_file] [source]"
    echo ""
    echo "Parameters:"
    echo "  backup_file  - Name of the backup file (e.g., backup_20250907_144608.sql.gz)"
    echo "  source       - 'local' or 's3' (default: local)"
    echo ""
    echo "Examples:"
    echo "  $0 backup_20250907_144608.sql.gz local"
    echo "  $0 backup_20250907_144608.sql.gz s3"
    echo ""
    echo "Interactive mode (no parameters):"
    echo "  $0"
}

# Function to list available backups
list_backups() {
    echo "=== Available Backups ==="
    echo ""

    echo "Local backups:"
    kamal server exec "ls -la /opt/docker/ubixar.com/backups/*.sql.gz 2>/dev/null || echo '  No local backups found'"

    echo ""
    echo "S3 backups (last 10):"
    kamal server exec "docker exec \$(docker ps --filter 'name=backup' --format '{{.ID}}' | head -1) bash -c 'aws s3 ls s3://backups/ubixar/ --endpoint-url \$AWS_ENDPOINT_URL 2>/dev/null | tail -10 || echo \"  Could not list S3 backups\"'"
    echo ""
}

# Function to create pre-restore backup
create_pre_restore_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local pre_backup_file="pre-restore_${timestamp}.sql.gz"

    log "Creating pre-restore backup..."

    # Step 1: Get postgres container ID
    local postgres_id
    postgres_id=$(kamal server exec "docker ps --filter 'name=postgres' --format '{{.ID}}' | head -1" 2>/dev/null | grep -E '^[a-f0-9]{12}$' | head -1)

    if [ -z "$postgres_id" ]; then
        log "ERROR: Could not find postgres container"
        return 1
    fi

    log "Using postgres container: $postgres_id"

    # Step 2: Create backup in postgres container (using direct commands)
    log "Creating backup in postgres container..."

    # Clean up any existing temp files first
    kamal server exec "docker exec $postgres_id rm -f /tmp/backup.sql /tmp/backup.sql.gz /tmp/$pre_backup_file" 2>/dev/null || true

    # Try direct pg_dump approach - PostgreSQL container should have postgres running
    log "Attempting direct pg_dump..."
    if kamal server exec "docker exec $postgres_id sh -c 'pg_dump -U postgres ubixar > /tmp/backup_$postgres_id.sql'"; then
        log "pg_dump successful, compressing..."
        if kamal server exec "docker exec $postgres_id gzip /tmp/backup_$postgres_id.sql"; then
            log "Compression successful, moving to final location..."
            if kamal server exec "docker exec $postgres_id mv /tmp/backup_$postgres_id.sql.gz /tmp/$pre_backup_file"; then
                log "Pre-restore backup created successfully"
            else
                log "ERROR: Failed to move backup file"
                return 1
            fi
        else
            log "ERROR: Failed to compress backup"
            return 1
        fi
    else
        log "ERROR: pg_dump failed"
        return 1
    fi

    # Step 3: Copy backup to host
    log "Copying backup to host..."
    if ! kamal server exec "docker cp $postgres_id:/tmp/$pre_backup_file /opt/docker/ubixar.com/backups/"; then
        log "ERROR: Failed to copy backup to host"
        return 1
    fi

    # Step 4: Clean up temp file
    kamal server exec "docker exec $postgres_id rm /tmp/$pre_backup_file" 2>/dev/null || true

    log "Pre-restore backup created: $pre_backup_file"
    echo "$pre_backup_file"
}

# Function to restore from local backup
restore_from_local() {
    local backup_file="$1"

    log "Checking if local backup exists..."
    if ! kamal server exec "test -f /opt/docker/ubixar.com/backups/$backup_file"; then
        log "ERROR: Local backup file not found: $backup_file"
        return 1
    fi

    log "Restoring from local backup: $backup_file"
    log "Method: Copy to postgres container and restore directly"

    # Step 1: Get postgres container ID
    local postgres_id
    postgres_id=$(kamal server exec "docker ps --filter 'name=postgres' --format '{{.ID}}' | head -1" 2>/dev/null | grep -E '^[a-f0-9]{12}$' | head -1)

    if [ -z "$postgres_id" ]; then
        log "ERROR: Could not find postgres container"
        return 1
    fi

    log "Using postgres container: $postgres_id"

    # Step 2: Copy backup to postgres container
    log "Copying backup to postgres container..."
    if ! kamal server exec "docker cp /opt/docker/ubixar.com/backups/$backup_file $postgres_id:/tmp/"; then
        log "ERROR: Failed to copy backup to postgres container"
        return 1
    fi

    # Step 3: Restore database
    log "Restoring database..."

    # Use direct commands approach
    log "Decompressing backup file..."
    if kamal server exec "docker exec $postgres_id gunzip /tmp/$backup_file"; then
        local sql_file="${backup_file%.gz}"
        log "Restoring database from $sql_file..."
        if kamal server exec "docker exec $postgres_id psql -U postgres -d ubixar -f /tmp/$sql_file"; then
            log "Database restore successful"
            # Clean up
            kamal server exec "docker exec $postgres_id rm -f /tmp/$sql_file" 2>/dev/null || true
        else
            log "ERROR: Database restore failed"
            return 1
        fi
    else
        log "ERROR: Failed to decompress backup file"
        return 1
    fi

    # Step 4: Clean up temp files
    local cleanup_script="#!/bin/sh
rm -f /tmp/$backup_file /tmp/\${backup_file%.gz}"
    kamal server exec "echo '$cleanup_script' | docker exec -i $postgres_id sh" 2>/dev/null || true

    log "Local restore completed successfully"
    return 0
}

# Function to restore from S3
restore_from_s3() {
    local backup_file="$1"
    local s3_path="s3://backups/ubixar/$backup_file"

    log "Checking if S3 backup exists..."
    if ! kamal server exec "docker exec \$(docker ps --filter 'name=backup' --format '{{.ID}}' | head -1) bash -c 'aws s3 ls $s3_path --endpoint-url \$AWS_ENDPOINT_URL > /dev/null 2>&1'"; then
        log "ERROR: S3 backup file not found: $s3_path"
        return 1
    fi

    log "Restoring from S3: $s3_path"
    log "Method: Download to postgres container and restore directly"

    # Download to postgres container and restore there (avoids network issues)
    if kamal server exec "POSTGRES_ID=\$(docker ps --filter 'name=postgres' --format '{{.ID}}' | head -1) && BACKUP_ID=\$(docker ps --filter 'name=backup' --format '{{.ID}}' | head -1) && docker exec \$BACKUP_ID bash -c 'aws s3 cp $s3_path /tmp/$backup_file --endpoint-url \$AWS_ENDPOINT_URL' && docker cp \$BACKUP_ID:/tmp/$backup_file \$POSTGRES_ID:/tmp/ && docker exec \$POSTGRES_ID bash -c 'gunzip -c /tmp/$backup_file | PGPASSWORD=\$POSTGRES_PASSWORD psql -U postgres -d ubixar -q && rm /tmp/$backup_file' && docker exec \$BACKUP_ID rm /tmp/$backup_file"; then
        log "S3 restore completed successfully"
        return 0
    else
        log "ERROR: S3 restore failed"
        return 1
    fi
}

# Function for interactive mode
interactive_mode() {
    echo "=== Interactive Restore Mode ==="
    echo ""
    
    list_backups
    
    echo "Enter backup details:"
    read -p "Backup filename: " backup_file
    read -p "Source [local/s3]: " source
    
    if [ -z "$backup_file" ]; then
        log "ERROR: Backup filename is required"
        exit 1
    fi
    
    source=${source:-local}
    
    echo ""
    echo "Restore Summary:"
    echo "  File: $backup_file"
    echo "  Source: $source"
    echo "  Target: ubixar-postgres/ubixar"
    echo ""
    
    read -p "This will OVERWRITE the current database. Continue? [yes/no]: " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled by user"
        exit 0
    fi
    
    perform_restore "$backup_file" "$source"
}

# Function to perform the actual restore
perform_restore() {
    local backup_file="$1"
    local source="$2"
    
    log "Starting restore process..."
    log "Target: ubixar-postgres/ubixar"
    
    # Test database connection
    log "Testing database connection..."
    local test_postgres_id
    test_postgres_id=$(kamal server exec "docker ps --filter 'name=postgres' --format '{{.ID}}' | head -1" 2>/dev/null | grep -E '^[a-f0-9]{12}$' | head -1)

    if [ -z "$test_postgres_id" ]; then
        log "ERROR: Could not find postgres container for connection test"
        exit 1
    fi

    if ! kamal server exec "docker exec $test_postgres_id bash -c 'PGPASSWORD=\$POSTGRES_PASSWORD pg_isready -U postgres -d ubixar > /dev/null 2>&1'"; then
        log "ERROR: Cannot connect to PostgreSQL database"
        exit 1
    fi
    
    # Create pre-restore backup
    if ! create_pre_restore_backup; then
        read -p "Could not create pre-restore backup. Continue anyway? [yes/no]: " continue_anyway
        if [ "$continue_anyway" != "yes" ]; then
            log "Restore cancelled"
            exit 1
        fi
    fi
    
    # Perform restore based on source
    case "$source" in
        "local")
            restore_from_local "$backup_file"
            ;;
        "s3")
            restore_from_s3 "$backup_file"
            ;;
        *)
            log "ERROR: Invalid source '$source'. Use 'local' or 's3'"
            exit 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        log "Restore completed successfully!"
    else
        log "Restore failed!"
        exit 1
    fi
}

# Main execution
main() {
    # Parse command line arguments
    if [ $# -eq 0 ]; then
        # Interactive mode
        interactive_mode
    elif [ $# -eq 1 ] && [ "$1" = "--help" ]; then
        show_usage
        exit 0
    elif [ $# -ge 1 ] && [ $# -le 2 ]; then
        # Command line mode
        backup_file="$1"
        source="${2:-local}"
        perform_restore "$backup_file" "$source"
    else
        show_usage
        exit 1
    fi
}

# Run main function
main "$@"

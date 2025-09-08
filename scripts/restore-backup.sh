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
    echo "PostgreSQL Backup Restore Tool for Kamal (Local Backups Only)"
    echo ""
    echo "Usage: $0 [backup_file]"
    echo ""
    echo "Parameters:"
    echo "  backup_file  - Name of the local backup file (e.g., backup_20250907_144608.sql.gz)"
    echo ""
    echo "Examples:"
    echo "  $0 backup_20250907_144608.sql.gz"
    echo ""
    echo "Interactive mode (no parameters):"
    echo "  $0"
    echo ""
    echo "Note: This script only restores from local backups."
    echo "To download a remote backup from S3, use: ./download-backup.sh [backup_file]"
}

# Function to list available local backups
list_backups() {
    echo "=== Available Local Backups ==="
    echo ""

    echo "Local backups:"
    kamal server exec "ls -la /opt/docker/ubixar.com/backups/*.sql.gz 2>/dev/null || echo '  No local backups found'"

    echo ""
    echo "To download a backup from S3, use: ./download-backup.sh [backup_file]"
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
        log "To download this backup from S3, run: ./download-backup.sh $backup_file"
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

    # Clean up any existing decompressed files first
    local sql_file="${backup_file%.gz}"
    kamal server exec "docker exec $postgres_id rm -f /tmp/$sql_file" 2>/dev/null || true

    if kamal server exec "docker exec $postgres_id gunzip /tmp/$backup_file"; then
        log "Dropping and recreating database to ensure clean restore..."

        # Terminate any active connections to the database
        log "Terminating active connections to ubixar database..."
        kamal server exec "docker exec $postgres_id psql -U postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'ubixar' AND pid <> pg_backend_pid();\"" 2>/dev/null || true

        # Drop and recreate the database to ensure clean restore
        if kamal server exec "docker exec $postgres_id psql -U postgres -c \"DROP DATABASE IF EXISTS ubixar;\""; then
            log "Database dropped successfully"
        else
            log "ERROR: Failed to drop database"
            return 1
        fi

        # Create ubixar user if it doesn't exist
        log "Ensuring ubixar user exists..."
        kamal server exec "docker exec $postgres_id psql -U postgres -c \"CREATE USER ubixar WITH PASSWORD '\$POSTGRES_PASSWORD';\"" 2>/dev/null || log "ubixar user already exists or creation failed (continuing...)"

        # Create database with ubixar as owner
        if kamal server exec "docker exec $postgres_id psql -U postgres -c \"CREATE DATABASE ubixar OWNER ubixar;\""; then
            log "Database recreated successfully with ubixar as owner"
        else
            log "ERROR: Failed to create database"
            return 1
        fi

        log "Restoring database from $sql_file..."
        if kamal server exec "docker exec $postgres_id bash -c 'PGPASSWORD=\$POSTGRES_PASSWORD psql -U ubixar -d ubixar -f /tmp/$sql_file'"; then
            log "Database restore successful"

            # Verify the restore by checking table count
            log "Verifying restore..."
            local table_count
            table_count=$(kamal server exec "docker exec $postgres_id bash -c 'PGPASSWORD=\$POSTGRES_PASSWORD psql -U ubixar -d ubixar -t -c \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \\\"public\\\";\"'" 2>/dev/null | tr -d ' \n' || echo "0")
            log "Restored database contains $table_count tables"

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



# Function for interactive mode
interactive_mode() {
    echo "=== Interactive Restore Mode (Local Backups Only) ==="
    echo ""

    list_backups

    echo "Enter backup details:"
    read -p "Backup filename: " backup_file

    if [ -z "$backup_file" ]; then
        log "ERROR: Backup filename is required"
        exit 1
    fi

    echo ""
    echo "Restore Summary:"
    echo "  File: $backup_file"
    echo "  Source: local"
    echo "  Target: ubixar-postgres/ubixar"
    echo ""

    read -p "This will OVERWRITE the current database. Continue? [yes/no]: " confirm

    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled by user"
        exit 0
    fi

    perform_restore "$backup_file"
}

# Function to perform the actual restore
perform_restore() {
    local backup_file="$1"

    log "Starting restore process..."
    log "Target: ubixar-postgres/ubixar"
    log "Source: local backup"

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

    # Perform restore from local backup
    if restore_from_local "$backup_file"; then
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
    elif [ $# -eq 1 ]; then
        # Command line mode - single backup file argument
        backup_file="$1"
        perform_restore "$backup_file"
    else
        show_usage
        exit 1
    fi
}

# Run main function
main "$@"

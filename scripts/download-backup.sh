#!/bin/bash

# PostgreSQL Backup Download Script for Kamal
# This script downloads backups from S3 to local storage

set -e

# Function to log messages with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to show usage
show_usage() {
    echo "PostgreSQL Backup Download Tool for Kamal"
    echo ""
    echo "Usage: $0 [backup_file]"
    echo ""
    echo "Parameters:"
    echo "  backup_file  - Name of the backup file to download (e.g., backup_20250907_144608.sql.gz)"
    echo ""
    echo "Examples:"
    echo "  $0 backup_20250907_144608.sql.gz"
    echo ""
    echo "Interactive mode (no parameters):"
    echo "  $0"
    echo ""
    echo "Note: This script downloads backups from S3 to local storage."
    echo "After downloading, use ./restore-backup.sh to restore the backup."
}

# Function to list available S3 backups
list_s3_backups() {
    echo "=== Available S3 Backups ==="
    echo ""

    echo "S3 backups (last 20):"
    kamal server exec "docker exec \$(docker ps --filter 'name=backup' --format '{{.ID}}' | head -1) bash -c 'aws s3 ls s3://backups/ubixar/ --endpoint-url \$AWS_ENDPOINT_URL 2>/dev/null | tail -20 || echo \"  Could not list S3 backups\"'"
    echo ""
}

# Function to download backup from S3
download_from_s3() {
    local backup_file="$1"
    local s3_path="s3://backups/ubixar/$backup_file"

    log "Checking if S3 backup exists..."
    if ! kamal server exec "docker exec \$(docker ps --filter 'name=backup' --format '{{.ID}}' | head -1) bash -c 'aws s3 ls $s3_path --endpoint-url \$AWS_ENDPOINT_URL > /dev/null 2>&1'"; then
        log "ERROR: S3 backup file not found: $s3_path"
        return 1
    fi

    log "S3 backup file confirmed: $s3_path"

    # Check if local backup already exists
    if kamal server exec "test -f /opt/docker/ubixar.com/backups/$backup_file"; then
        log "WARNING: Local backup file already exists: $backup_file"
        read -p "Overwrite existing local backup? [yes/no]: " overwrite
        if [ "$overwrite" != "yes" ]; then
            log "Download cancelled by user"
            return 1
        fi
    fi

    # Download backup using the backup container
    log "Downloading backup to local storage..."
    log "Step 1: Download to backup container..."
    if ! kamal server exec "docker exec \$(docker ps --filter 'name=backup' --format '{{.ID}}' | head -1) bash -c 'aws s3 cp $s3_path /tmp/$backup_file --endpoint-url \$AWS_ENDPOINT_URL'"; then
        log "ERROR: Failed to download from S3 to backup container"
        return 1
    fi

    log "Step 2: Copy to host filesystem..."
    if ! kamal server exec "docker cp \$(docker ps --filter 'name=backup' --format '{{.ID}}' | head -1):/tmp/$backup_file /opt/docker/ubixar.com/backups/"; then
        log "ERROR: Failed to copy backup to host"
        # Clean up temp file
        kamal server exec "docker exec \$(docker ps --filter 'name=backup' --format '{{.ID}}' | head -1) rm -f /tmp/$backup_file" 2>/dev/null || true
        return 1
    fi

    log "Step 3: Clean up temporary file..."
    kamal server exec "docker exec \$(docker ps --filter 'name=backup' --format '{{.ID}}' | head -1) rm -f /tmp/$backup_file" 2>/dev/null || true

    log "Download completed successfully: $backup_file"
    log "File saved to: /opt/docker/ubixar.com/backups/$backup_file"
    log ""
    log "To restore this backup, run: ./restore-backup.sh $backup_file"
    return 0
}

# Function for interactive mode
interactive_mode() {
    echo "=== Interactive Download Mode ==="
    echo ""
    
    list_s3_backups
    
    echo "Enter backup details:"
    read -p "Backup filename to download: " backup_file
    
    if [ -z "$backup_file" ]; then
        log "ERROR: Backup filename is required"
        exit 1
    fi
    
    echo ""
    echo "Download Summary:"
    echo "  File: $backup_file"
    echo "  Source: S3 (s3://backups/ubixar/)"
    echo "  Destination: /opt/docker/ubixar.com/backups/"
    echo ""
    
    read -p "Continue with download? [yes/no]: " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Download cancelled by user"
        exit 0
    fi
    
    perform_download "$backup_file"
}

# Function to perform the actual download
perform_download() {
    local backup_file="$1"

    log "Starting download process..."
    log "Source: S3 (s3://backups/ubixar/)"
    log "Destination: /opt/docker/ubixar.com/backups/"

    # Test backup container availability
    log "Testing backup container availability..."
    if ! kamal server exec "docker ps --filter 'name=backup' --format '{{.ID}}' | head -1" >/dev/null 2>&1; then
        log "ERROR: Could not find backup container"
        exit 1
    fi

    log "Backup container found and accessible"

    # Test S3 connectivity
    log "Testing S3 connectivity..."
    if ! kamal server exec "docker exec \$(docker ps --filter 'name=backup' --format '{{.ID}}' | head -1) bash -c 'aws s3 ls s3://backups/ubixar/ --endpoint-url \$AWS_ENDPOINT_URL > /dev/null 2>&1'"; then
        log "ERROR: Cannot connect to S3 storage"
        exit 1
    fi

    log "S3 connectivity confirmed"

    # Perform download
    if download_from_s3 "$backup_file"; then
        log "Download completed successfully!"
    else
        log "Download failed!"
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
        perform_download "$backup_file"
    else
        show_usage
        exit 1
    fi
}

# Run main function
main "$@"

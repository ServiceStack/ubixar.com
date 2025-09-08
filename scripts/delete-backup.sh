#!/bin/bash

# PostgreSQL Backup Delete Script for Kamal
# This script safely removes local backup files

set -e

# Function to log messages with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to show usage
show_usage() {
    echo "PostgreSQL Backup Delete Tool for Kamal"
    echo ""
    echo "Usage: $0 [backup_file]"
    echo ""
    echo "Parameters:"
    echo "  backup_file  - Name of the local backup file to delete (e.g., backup_20250907_144608.sql.gz)"
    echo ""
    echo "Examples:"
    echo "  $0 backup_20250907_144608.sql.gz"
    echo ""
    echo "Interactive mode (no parameters):"
    echo "  $0"
    echo ""
    echo "Note: This script only deletes local backup files."
    echo "It does NOT delete backups from S3 storage."
}

# Function to list available local backups
list_local_backups() {
    echo "=== Available Local Backups ==="
    echo ""

    echo "Local backups:"
    kamal server exec "ls -la /opt/docker/ubixar.com/backups/*.sql.gz 2>/dev/null || echo '  No local backups found'"
    echo ""
}

# Function to delete backup from local storage
delete_local_backup() {
    local backup_file="$1"
    local backup_path="/opt/docker/ubixar.com/backups/$backup_file"

    log "Checking if local backup exists..."
    if ! kamal server exec "test -f $backup_path"; then
        log "ERROR: Local backup file not found: $backup_file"
        return 1
    fi

    log "Local backup file confirmed: $backup_path"
    
    # Get file info before deletion
    log "Backup file details:"
    kamal server exec "ls -la $backup_path"
    
    # Confirm deletion
    echo ""
    echo "WARNING: This will permanently delete the backup file!"
    echo "File: $backup_file"
    echo "Path: $backup_path"
    echo ""
    read -p "Are you sure you want to delete this backup? [yes/no]: " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Deletion cancelled by user"
        return 1
    fi

    # Perform deletion
    log "Deleting backup file..."
    if kamal server exec "rm -f $backup_path"; then
        log "Backup file deleted successfully: $backup_file"
        return 0
    else
        log "ERROR: Failed to delete backup file"
        return 1
    fi
}

# Function for interactive mode
interactive_mode() {
    echo "=== Interactive Delete Mode ==="
    echo ""
    
    list_local_backups
    
    echo "Enter backup details:"
    read -p "Backup filename to delete: " backup_file
    
    if [ -z "$backup_file" ]; then
        log "ERROR: Backup filename is required"
        exit 1
    fi
    
    echo ""
    echo "Delete Summary:"
    echo "  File: $backup_file"
    echo "  Location: Local storage (/opt/docker/ubixar.com/backups/)"
    echo "  Action: PERMANENT DELETION"
    echo ""
    
    perform_delete "$backup_file"
}

# Function to perform the actual deletion
perform_delete() {
    local backup_file="$1"
    
    log "Starting delete process..."
    log "Target: Local backup file"
    log "File: $backup_file"
    
    # Validate backup filename format
    if [[ ! "$backup_file" =~ ^[a-zA-Z0-9_-]+\.sql\.gz$ ]]; then
        log "ERROR: Invalid backup filename format. Expected format: *.sql.gz"
        exit 1
    fi
    
    # Perform deletion
    if delete_local_backup "$backup_file"; then
        log "Delete completed successfully!"
        echo ""
        echo "Remaining local backups:"
        kamal server exec "ls -la /opt/docker/ubixar.com/backups/*.sql.gz 2>/dev/null || echo '  No local backups found'"
    else
        log "Delete failed!"
        exit 1
    fi
}

# Function to delete multiple backups (batch mode)
batch_delete_mode() {
    echo "=== Batch Delete Mode ==="
    echo ""
    
    list_local_backups
    
    echo "Enter backup filenames to delete (one per line, empty line to finish):"
    local backup_files=()
    
    while true; do
        read -p "Backup filename: " backup_file
        if [ -z "$backup_file" ]; then
            break
        fi
        backup_files+=("$backup_file")
    done
    
    if [ ${#backup_files[@]} -eq 0 ]; then
        log "No backup files specified"
        exit 0
    fi
    
    echo ""
    echo "Batch Delete Summary:"
    echo "  Files to delete: ${#backup_files[@]}"
    for file in "${backup_files[@]}"; do
        echo "    - $file"
    done
    echo "  Location: Local storage (/opt/docker/ubixar.com/backups/)"
    echo "  Action: PERMANENT DELETION"
    echo ""
    
    read -p "Delete all these backup files? [yes/no]: " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Batch deletion cancelled by user"
        exit 0
    fi
    
    # Delete each file
    local success_count=0
    local fail_count=0
    
    for backup_file in "${backup_files[@]}"; do
        log "Processing: $backup_file"
        if kamal server exec "test -f /opt/docker/ubixar.com/backups/$backup_file" && kamal server exec "rm -f /opt/docker/ubixar.com/backups/$backup_file"; then
            log "✓ Deleted: $backup_file"
            ((success_count++))
        else
            log "✗ Failed to delete: $backup_file"
            ((fail_count++))
        fi
    done
    
    echo ""
    log "Batch deletion completed!"
    log "Successfully deleted: $success_count files"
    log "Failed to delete: $fail_count files"
    
    if [ $fail_count -gt 0 ]; then
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
    elif [ $# -eq 1 ] && [ "$1" = "--batch" ]; then
        batch_delete_mode
        exit 0
    elif [ $# -eq 1 ]; then
        # Command line mode - single backup file argument
        backup_file="$1"
        perform_delete "$backup_file"
    else
        show_usage
        exit 1
    fi
}

# Run main function
main "$@"

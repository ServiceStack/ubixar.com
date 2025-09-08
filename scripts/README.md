# Scripts Directory

This directory contains deployment and maintenance scripts for the ubixar.com application.

## Backup & Restore Scripts

### `restore-backup.sh` ⭐ **Main Restore Script**
PostgreSQL backup restoration script that runs locally and orchestrates restore operations using the running PostgreSQL container. **Simplified to only restore from local backups.**

**Features:**
- Interactive mode with local backup listing
- Command-line mode for automation and scripting
- Automatic pre-restore backup creation (safety backup before restore)
- Local backup restoration only (simplified workflow)
- Database connection validation before proceeding
- Comprehensive logging with timestamps for troubleshooting
- Direct container execution (avoids `kamal accessory exec` limitations)
- Step-by-step error handling and cleanup

**Usage:**
```bash
# Interactive mode (recommended - shows available local backups and prompts for confirmation)
./scripts/restore-backup.sh

# Command line mode - restore from local backup
./scripts/restore-backup.sh backup_20250907_144608.sql.gz

# Show help and usage information
./scripts/restore-backup.sh --help
```

### `download-backup.sh` 📥 **Backup Download Script**
Downloads backups from S3/Cloudflare R2 to local storage, making them available for restoration.

**Features:**
- Interactive mode with S3 backup listing
- Command-line mode for automation
- Checks for existing local backups before overwriting
- Downloads directly to local backup directory
- Comprehensive logging and error handling

**Usage:**
```bash
# Interactive mode (shows available S3 backups)
./scripts/download-backup.sh

# Command line mode - download specific backup
./scripts/download-backup.sh backup_20250907_144608.sql.gz

# Show help and usage information
./scripts/download-backup.sh --help
```

### `delete-backup.sh` 🗑️ **Backup Delete Script**
Safely removes local backup files with confirmation prompts and batch deletion support.

**Features:**
- Interactive mode with local backup listing
- Command-line mode for single file deletion
- Batch mode for deleting multiple files
- Safety confirmations before deletion
- Filename validation and error handling
- Shows remaining backups after deletion

**Usage:**
```bash
# Interactive mode (shows available local backups)
./scripts/delete-backup.sh

# Command line mode - delete specific backup
./scripts/delete-backup.sh backup_20250907_144608.sql.gz

# Batch mode - delete multiple backups interactively
./scripts/delete-backup.sh --batch

# Show help and usage information
./scripts/delete-backup.sh --help
```

### Other Scripts

#### `setup-restore.sh` 📄 **Legacy Script (Not Used)**
This script was part of the original approach that tried to install restore scripts into containers. It's kept for reference but is not needed with the current working solution.

#### `restore-script.sh` 📄 **Template Script (Not Used)**
Original restore script template that was designed to run inside containers. The current `restore-backup.sh` incorporates this functionality but runs locally instead.

## Quick Start

### **Complete Backup Management Workflow**

#### **Step 1: Download Remote Backup (if needed)**
```bash
# Interactive download (shows available S3 backups)
./scripts/download-backup.sh

# Command-line download
./scripts/download-backup.sh backup_20250907_144608.sql.gz
```

#### **Step 2: Restore from Local Backup**
```bash
# Interactive restore (safest - shows local backups, creates pre-restore backup, asks for confirmation)
./scripts/restore-backup.sh

# Command-line restore from local backup
./scripts/restore-backup.sh backup_20250907_144608.sql.gz
```

#### **Step 3: Clean Up Old Backups (optional)**
```bash
# Interactive delete (shows available local backups)
./scripts/delete-backup.sh

# Command-line delete
./scripts/delete-backup.sh backup_20250907_144608.sql.gz

# Batch delete multiple backups
./scripts/delete-backup.sh --batch
```

### **List Available Backups**
```bash
# List local backups on host
kamal server exec "ls -la /opt/docker/ubixar.com/backups/"

# List S3/R2 backups (through backup container)
kamal server exec "docker exec \$(docker ps --filter 'name=backup' --format '{{.ID}}' | head -1) aws s3 ls s3://backups/ubixar/ --endpoint-url \$AWS_ENDPOINT_URL"
```

### **Direct Commands (Advanced Users)**
If you prefer to run commands directly without the scripts:

```bash
# Download from S3 (if needed)
BACKUP_ID=$(kamal server exec "docker ps --filter 'name=backup' --format '{{.ID}}' | head -1")
kamal server exec "docker exec $BACKUP_ID aws s3 cp s3://backups/ubixar/backup_20250907_144608.sql.gz /tmp/ --endpoint-url \$AWS_ENDPOINT_URL"
kamal server exec "docker cp $BACKUP_ID:/tmp/backup_20250907_144608.sql.gz /opt/docker/ubixar.com/backups/"

# Restore from local backup
POSTGRES_ID=$(kamal server exec "docker ps --filter 'name=postgres' --format '{{.ID}}' | head -1" | grep -E '^[a-f0-9]{12}$')
kamal server exec "docker cp /opt/docker/ubixar.com/backups/backup_20250907_144608.sql.gz $POSTGRES_ID:/tmp/"
kamal server exec "docker exec $POSTGRES_ID gunzip /tmp/backup_20250907_144608.sql.gz"
kamal server exec "docker exec $POSTGRES_ID psql -U postgres -d ubixar -f /tmp/backup_20250907_144608.sql"
kamal server exec "docker exec $POSTGRES_ID rm /tmp/backup_20250907_144608.sql"
```

## Safety Features

- **Pre-restore backup**: Automatically creates `pre-restore_TIMESTAMP.sql.gz` before any restore operation
- **File validation**: Checks backup file existence on host/S3 before attempting restore
- **Database connection testing**: Verifies PostgreSQL connectivity before proceeding
- **Interactive confirmation**: Prevents accidental database overwrites in interactive mode
- **Step-by-step logging**: Detailed timestamps and progress information for troubleshooting
- **Automatic cleanup**: Removes temporary files after successful operations
- **Error handling**: Each step is validated with proper error messages

## How It Works

The restore script uses a **direct container execution** approach:

1. **Finds running containers**: Locates the actual running PostgreSQL container (not ephemeral ones)
2. **Direct file operations**: Copies backup files directly to/from the PostgreSQL container
3. **In-container execution**: Runs `pg_dump`, `psql`, etc. inside the PostgreSQL container using Unix sockets
4. **Host file access**: Accesses backup files directly on the host filesystem (`/opt/docker/ubixar.com/backups/`)

## Troubleshooting

### Why not use `kamal accessory exec`?
`kamal accessory exec` creates ephemeral containers that:
- Don't have persistent volume mounts properly configured
- Often don't display command output (silent failures)
- Don't maintain environment variables consistently
- Create new containers each time instead of using the running ones

### Current Solution: Direct Container Access
The script uses `kamal server exec "docker exec CONTAINER_ID command"` to:
- Run commands in the actual running PostgreSQL container
- Access proper volume mounts and environment variables
- Get reliable command output and error messages
- Use PostgreSQL's default Unix socket connections

### Common Issues and Solutions

**"No such file or directory" errors:**
- Check that backup files exist: `kamal server exec "ls -la /opt/docker/ubixar.com/backups/"`
- Verify container is running: `kamal server exec "docker ps --filter 'name=postgres'"`

**PostgreSQL connection errors:**
- The script uses Unix socket connections (default) which should work inside the PostgreSQL container
- If issues persist, check PostgreSQL logs: `kamal accessory logs postgres`

**Permission errors:**
- PostgreSQL container runs as postgres user by default
- Backup files should be accessible to the postgres user inside the container

## Related Documentation

- `../BACKUP_SETUP.md` - Complete backup system setup guide
- `../BACKUP_RESTORE.md` - Detailed restoration procedures and troubleshooting

# Backup Restoration Guide

This guide covers different methods to restore PostgreSQL backups in your Kamal deployment.

## Available Backup Locations

- **Local (Host)**: `/opt/docker/ubixar.com/backups/backup_YYYYMMDD_HHMMSS.sql.gz`
- **Cloudflare R2**: `s3://backups/ubixar/backup_YYYYMMDD_HHMMSS.sql.gz`

## Method 1: Restore from Local Backup (Fastest)

### Step 1: List Available Backups
```bash
# List local backups
kamal accessory exec backup "ls -la /backups/"

# Or check on the host directly
ls -la /opt/docker/ubixar.com/backups/
```

### Step 2: Restore from Local Backup
```bash
# Replace YYYYMMDD_HHMMSS with your actual backup timestamp
BACKUP_FILE="backup_20250907_144608.sql.gz"

# Method A: Direct restore via backup container
kamal accessory exec backup "gunzip -c /backups/$BACKUP_FILE | PGPASSWORD=\$POSTGRES_PASSWORD psql -h ubixar-postgres -U postgres -d ubixar"

# Method B: Copy to postgres container and restore
kamal accessory exec backup "gunzip -c /backups/$BACKUP_FILE" | kamal accessory exec postgres -i "PGPASSWORD=\$POSTGRES_PASSWORD psql -U postgres -d ubixar"
```

## Method 2: Restore from S3/R2 (Remote Access)

### Step 1: List S3 Backups
```bash
# List R2 backups
kamal accessory exec backup "aws s3 ls s3://backups/ubixar/ --endpoint-url \$AWS_ENDPOINT_URL"
```

### Step 2: Download and Restore from S3
```bash
BACKUP_FILE="backup_20250907_144608.sql.gz"

# Download from R2 and restore in one command
kamal accessory exec backup "aws s3 cp s3://backups/ubixar/$BACKUP_FILE - --endpoint-url \$AWS_ENDPOINT_URL | gunzip | PGPASSWORD=\$POSTGRES_PASSWORD psql -h ubixar-postgres -U postgres -d ubixar"
```

## Method 3: Interactive Restore Script

Create a restore script for easier management:
```bash
# Create restore script on the server
kamal accessory exec backup "cat > /usr/local/bin/restore-backup.sh << 'EOF'
#!/bin/bash
set -e

BACKUP_FILE=\$1
RESTORE_SOURCE=\${2:-local}  # local or s3

if [ -z \"\$BACKUP_FILE\" ]; then
    echo \"Usage: \$0 <backup_file> [local|s3]\"
    echo \"Example: \$0 backup_20250907_144608.sql.gz local\"
    exit 1
fi

echo \"[$(date)] Starting restore of \$BACKUP_FILE from \$RESTORE_SOURCE\"

if [ \"\$RESTORE_SOURCE\" = \"s3\" ]; then
    echo \"[$(date)] Downloading from S3...\"
    aws s3 cp \"s3://backups/ubixar/\$BACKUP_FILE\" \"/tmp/\$BACKUP_FILE\" --endpoint-url \"\$AWS_ENDPOINT_URL\"
    BACKUP_PATH=\"/tmp/\$BACKUP_FILE\"
else
    BACKUP_PATH=\"/backups/\$BACKUP_FILE\"
fi

if [ ! -f \"\$BACKUP_PATH\" ]; then
    echo \"ERROR: Backup file \$BACKUP_PATH not found\"
    exit 1
fi

echo \"[$(date)] Restoring database...\"
gunzip -c \"\$BACKUP_PATH\" | PGPASSWORD=\"\$POSTGRES_PASSWORD\" psql -h ubixar-postgres -U postgres -d ubixar

echo \"[$(date)] Restore completed successfully\"

# Cleanup temp file if downloaded from S3
if [ \"\$RESTORE_SOURCE\" = \"s3\" ]; then
    rm -f \"/tmp/\$BACKUP_FILE\"
fi
EOF"

# Make it executable
kamal accessory exec backup "chmod +x /usr/local/bin/restore-backup.sh"
```

### Using the Restore Script
```bash
# Restore from local backup
kamal accessory exec backup "/usr/local/bin/restore-backup.sh backup_20250907_144608.sql.gz local"

# Restore from S3 backup
kamal accessory exec backup "/usr/local/bin/restore-backup.sh backup_20250907_144608.sql.gz s3"
```

## Method 4: Emergency Restore (New Database)

If you need to restore to a completely fresh database:

### Step 1: Stop Application
```bash
kamal app stop
```

### Step 2: Recreate Database
```bash
# Drop and recreate database
kamal accessory exec postgres "PGPASSWORD=\$POSTGRES_PASSWORD psql -U postgres -c 'DROP DATABASE IF EXISTS ubixar;'"
kamal accessory exec postgres "PGPASSWORD=\$POSTGRES_PASSWORD psql -U postgres -c 'CREATE DATABASE ubixar;'"
```

### Step 3: Restore Backup
```bash
BACKUP_FILE="backup_20250907_144608.sql.gz"
kamal accessory exec backup "gunzip -c /backups/$BACKUP_FILE | PGPASSWORD=\$POSTGRES_PASSWORD psql -h ubixar-postgres -U postgres -d ubixar"
```

### Step 4: Restart Application
```bash
kamal app start
```

## Method 5: Point-in-Time Recovery Script

For automated restore with confirmation:

```bash
# Create a comprehensive restore script
kamal accessory exec backup "cat > /usr/local/bin/restore-with-confirmation.sh << 'EOF'
#!/bin/bash
set -e

echo \"=== PostgreSQL Backup Restore Tool ===\"
echo \"Available backups:\"
echo \"\"

echo \"Local backups:\"
ls -la /backups/ | grep -E '\.sql\.gz$' | tail -10

echo \"\"
echo \"S3 backups (last 10):\"
aws s3 ls s3://backups/ubixar/ --endpoint-url \"\$AWS_ENDPOINT_URL\" | tail -10

echo \"\"
read -p \"Enter backup filename (e.g., backup_20250907_144608.sql.gz): \" BACKUP_FILE
read -p \"Restore from [local/s3]: \" SOURCE
read -p \"This will OVERWRITE the current database. Are you sure? [yes/no]: \" CONFIRM

if [ \"\$CONFIRM\" != \"yes\" ]; then
    echo \"Restore cancelled.\"
    exit 0
fi

echo \"[$(date)] Starting restore process...\"

# Create a pre-restore backup
echo \"[$(date)] Creating pre-restore backup...\"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PGPASSWORD=\"\$POSTGRES_PASSWORD\" pg_dump -h ubixar-postgres -U postgres -d ubixar | gzip > \"/backups/pre-restore_\$TIMESTAMP.sql.gz\"
echo \"[$(date)] Pre-restore backup saved as: pre-restore_\$TIMESTAMP.sql.gz\"

# Perform restore
if [ \"\$SOURCE\" = \"s3\" ]; then
    echo \"[$(date)] Downloading and restoring from S3...\"
    aws s3 cp \"s3://backups/ubixar/\$BACKUP_FILE\" - --endpoint-url \"\$AWS_ENDPOINT_URL\" | gunzip | PGPASSWORD=\"\$POSTGRES_PASSWORD\" psql -h ubixar-postgres -U postgres -d ubixar
else
    echo \"[$(date)] Restoring from local backup...\"
    gunzip -c \"/backups/\$BACKUP_FILE\" | PGPASSWORD=\"\$POSTGRES_PASSWORD\" psql -h ubixar-postgres -U postgres -d ubixar
fi

echo \"[$(date)] Restore completed successfully!\"
echo \"Pre-restore backup available at: /backups/pre-restore_\$TIMESTAMP.sql.gz\"
EOF"

kamal accessory exec backup "chmod +x /usr/local/bin/restore-with-confirmation.sh"
```

### Using the Interactive Restore
```bash
kamal accessory exec backup "/usr/local/bin/restore-with-confirmation.sh"
```

## Best Practices

### 1. Always Create Pre-Restore Backup
Before any restore, create a backup of the current state:
```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
kamal accessory exec backup "PGPASSWORD=\$POSTGRES_PASSWORD pg_dump -h ubixar-postgres -U postgres -d ubixar | gzip > /backups/pre-restore_$TIMESTAMP.sql.gz"
```

### 2. Test Restores Regularly
```bash
# Test restore to a temporary database
kamal accessory exec postgres "PGPASSWORD=\$POSTGRES_PASSWORD psql -U postgres -c 'CREATE DATABASE ubixar_test;'"
kamal accessory exec backup "gunzip -c /backups/backup_20250907_144608.sql.gz | PGPASSWORD=\$POSTGRES_PASSWORD psql -h ubixar-postgres -U postgres -d ubixar_test"
kamal accessory exec postgres "PGPASSWORD=\$POSTGRES_PASSWORD psql -U postgres -c 'DROP DATABASE ubixar_test;'"
```

### 3. Monitor Restore Process
```bash
# Monitor postgres logs during restore
kamal accessory logs postgres --follow
```

## Troubleshooting

### Connection Issues
```bash
# Test connectivity
kamal accessory exec backup "PGPASSWORD=\$POSTGRES_PASSWORD pg_isready -h ubixar-postgres -U postgres"
```

### Large Backup Restores
For very large backups, consider:
```bash
# Restore with progress monitoring
kamal accessory exec backup "pv /backups/backup_20250907_144608.sql.gz | gunzip | PGPASSWORD=\$POSTGRES_PASSWORD psql -h ubixar-postgres -U postgres -d ubixar"
```

### Disk Space Issues
```bash
# Check available space
kamal accessory exec backup "df -h /backups"
kamal accessory exec postgres "df -h /var/lib/postgresql/data"
```

## Quick Reference

### **Recommended: Use Local Restore Script** ⭐

```bash
# Interactive restore (recommended - shows backups, creates safety backup, asks for confirmation)
./scripts/restore-backup.sh

# Command line restore from local backup
./scripts/restore-backup.sh backup_20250907_144608.sql.gz local

# Command line restore from S3/R2 backup
./scripts/restore-backup.sh backup_20250907_144608.sql.gz s3

# Show help and usage
./scripts/restore-backup.sh --help
```

### **Direct Commands (Advanced Users)**

```bash
# List local backups
kamal server exec "ls -la /opt/docker/ubixar.com/backups/"

# List S3/R2 backups
kamal server exec "docker exec \$(docker ps --filter 'name=backup' --format '{{.ID}}' | head -1) aws s3 ls s3://backups/ubixar/ --endpoint-url \$AWS_ENDPOINT_URL"

# Manual local restore (multi-step)
POSTGRES_ID=$(kamal server exec "docker ps --filter 'name=postgres' --format '{{.ID}}' | head -1" | grep -E '^[a-f0-9]{12}$')
kamal server exec "docker cp /opt/docker/ubixar.com/backups/backup_20250907_144608.sql.gz $POSTGRES_ID:/tmp/"
kamal server exec "docker exec $POSTGRES_ID gunzip /tmp/backup_20250907_144608.sql.gz"
kamal server exec "docker exec $POSTGRES_ID psql -U postgres -d ubixar -f /tmp/backup_20250907_144608.sql"
kamal server exec "docker exec $POSTGRES_ID rm /tmp/backup_20250907_144608.sql"
```

### **Why Use the Script Instead of Direct Commands?**

The `./scripts/restore-backup.sh` script provides:
- **Safety**: Automatic pre-restore backup creation
- **Validation**: Checks file existence and database connectivity
- **User-friendly**: Interactive mode with backup listing and confirmation
- **Error handling**: Proper cleanup and detailed error messages
- **Convenience**: Single command instead of multiple manual steps

# Kamal Backup Accessory Setup

This document describes how to set up and use the backup accessory with Kamal deployment.

## Overview

The backup accessory provides automated PostgreSQL database backups with optional S3/R2 synchronization. It runs as a Kamal accessory alongside your main application and PostgreSQL database.

## Features

- Automated PostgreSQL database dumps every 24 hours (configurable)
- Compression of backup files (gzip)
- Local backup retention management (7 days by default)
- AWS S3/Cloudflare R2 synchronization
- S3 backup retention management (30 days by default)
- Proper logging and error handling
- Integration with Kamal deployment workflow

## Configuration

### Environment Variables

The backup accessory is configured through environment variables in your `.env` file:

```bash
# Required for S3/R2 backup sync (optional)
S3_BUCKET=your-backup-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=us-east-1

# For Cloudflare R2 (optional)
AWS_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
```

### Kamal Configuration

The backup accessory is already configured in `config/deploy.yml`:

```yaml
accessories:
  backup:
    image: ghcr.io/servicestack/backup-postgres:latest
    host: 5.78.128.205
    env:
      clear:
        POSTGRES_HOST: postgres
        POSTGRES_USER: postgres
        POSTGRES_DB: postgres
        BACKUP_INTERVAL: 86400  # 24 hours
        RETENTION_DAYS: 7       # Keep local backups for 7 days
        S3_RETENTION_DAYS: 30   # Keep S3 backups for 30 days
        S3_PREFIX: db-backups
      secret:
        - POSTGRES_PASSWORD
        - S3_BUCKET
        - AWS_ACCESS_KEY_ID
        - AWS_SECRET_ACCESS_KEY
        - AWS_DEFAULT_REGION
        - AWS_ENDPOINT_URL
    directories:
      - /opt/docker/ubixar.com/backups:/backups
    depends_on:
      - postgres
```

## Deployment

### 1. Deploy the Backup Accessory

The backup accessory uses the pre-built image `ghcr.io/servicestack/backup-postgres:latest` from the dedicated backup repository.

Deploy the backup accessory along with your application:

```bash
# Deploy all accessories (including backup)
kamal accessory boot all

# Or deploy just the backup accessory
kamal accessory boot backup
```

### 2. Check Status

```bash
# Check if backup accessory is running
kamal accessory details backup

# View backup logs
kamal accessory logs backup

# Follow backup logs in real-time
kamal accessory logs backup --follow
```

## Usage

### Manual Backup

To trigger a manual backup:

```bash
# Run a one-time backup
kamal accessory exec backup "/usr/local/bin/backup-script.sh"
```

### View Backups

```bash
# List local backup files
kamal accessory exec backup "ls -la /backups/"

# Check backup file sizes
kamal accessory exec backup "du -h /backups/*"
```

### S3/R2 Operations

If you have S3/R2 configured:

```bash
# List S3 backups
kamal accessory exec backup "aws s3 ls s3://your-bucket/db-backups/ --endpoint-url https://your-endpoint"

# Test S3 connection
kamal accessory exec backup "aws s3 ls s3://your-bucket --endpoint-url https://your-endpoint"
```

## Backup Schedule

- **Default**: Every 24 hours (86400 seconds)
- **First backup**: Runs immediately when the container starts
- **Configurable**: Set `BACKUP_INTERVAL` environment variable in seconds

## Retention Policies

- **Local backups**: 7 days (configurable via `RETENTION_DAYS`)
- **S3 backups**: 30 days (configurable via `S3_RETENTION_DAYS`)

## Backup File Format

- **Filename**: `backup_YYYYMMDD_HHMMSS.sql.gz`
- **Format**: Compressed PostgreSQL dump
- **Local location**: `/opt/docker/ubixar.com/backups/` on the host
- **S3 location**: `s3://bucket-name/db-backups/`

## Troubleshooting

### Check Backup Service Status

```bash
kamal accessory details backup
```

### View Detailed Logs

```bash
kamal accessory logs backup --lines 100
```

### Test Database Connection

```bash
kamal accessory exec backup "pg_isready -h postgres -U postgres"
```

### Test S3 Credentials

```bash
kamal accessory exec backup "aws sts get-caller-identity"
```

### Restart Backup Service

```bash
kamal accessory reboot backup
```

## Security Considerations

- Store AWS credentials securely in environment variables
- Use IAM roles with minimal required permissions for S3 access
- Ensure backup files are encrypted in transit and at rest
- Regularly test backup restoration procedures

## Monitoring

The backup service logs all operations with timestamps. Monitor the logs to ensure:
- Backups are created successfully
- S3 sync operations complete without errors
- Cleanup operations run as expected
- No connection issues with PostgreSQL

## Backup Restoration

To restore from a backup:

1. Copy the backup file to your local machine or accessible location
2. Decompress the backup: `gunzip backup_YYYYMMDD_HHMMSS.sql.gz`
3. Restore to PostgreSQL: `psql -h host -U user -d database < backup_YYYYMMDD_HHMMSS.sql`

Or use the Kamal accessory:

```bash
# Download a backup file
kamal accessory exec backup "cp /backups/backup_YYYYMMDD_HHMMSS.sql.gz /tmp/"

# Restore from backup (be careful!)
kamal accessory exec postgres "gunzip -c /path/to/backup.sql.gz | psql -U postgres -d postgres"
```

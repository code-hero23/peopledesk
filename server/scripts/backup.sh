#!/bin/bash

# ==========================================
# 🛡️ PEOPLE DESK AUTOMATED BACKUP SCRIPT
# ==========================================

# --- Configuration ---
BACKUP_DIR="/home/deploy/peopledesk_backups"  # Where to save backups on VPS
PROJECT_DIR="/home/deploy/PeopleDesk-app/peopledesk/server"  # Path to your server folder on VPS
DB_USER="postgres"
DB_NAME="peopledesk"
RETENTION_DAYS=7                       # Keep backups for 7 days

# Date format for filename
DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_NAME="backup_$DATE"
TARGET_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "=================================="
echo "🚀 Starting Backup: $DATE"
echo "=================================="

# 1. Create temporary folder for this specific backup
mkdir -p "$TARGET_PATH"

# 2. Dump Database
echo "📦 Dumping Database..."
# Use sudo -u postgres to avoid password prompts if configured, or use .pgpass
sudo -u postgres pg_dump "$DB_NAME" > "$TARGET_PATH/database.sql"

# 3. Copy Uploads (Images)
echo "📸 Copying Uploads..."
if [ -d "$PROJECT_DIR/uploads" ]; then
    cp -r "$PROJECT_DIR/uploads" "$TARGET_PATH/uploads"
else
    echo "⚠️ Warning: Uploads directory not found at $PROJECT_DIR/uploads"
fi

# 4. Compress into a single ZIP file
echo "🤐 Compressing..."
cd "$BACKUP_DIR"
zip -r "$BACKUP_NAME.zip" "$BACKUP_NAME"

# 5. Cleanup temporary folder (keep only the zip)
rm -rf "$TARGET_PATH"

echo "✅ Backup Created: $BACKUP_DIR/$BACKUP_NAME.zip"

# 6. Retention: Delete backups older than X days
echo "🧹 Cleaning up old backups (Older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "backup_*.zip" -type f -mtime +$RETENTION_DAYS -delete

echo "🎉 Backup Process Completed Successfully!"
echo "=================================="

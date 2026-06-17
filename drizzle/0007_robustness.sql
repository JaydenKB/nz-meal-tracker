-- Robustness: soft-delete columns + backup settings
ALTER TABLE ingredients ADD COLUMN archived_at TEXT;
ALTER TABLE recipes ADD COLUMN archived_at TEXT;
ALTER TABLE stores ADD COLUMN archived_at TEXT;
ALTER TABLE app_settings ADD COLUMN backup_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE app_settings ADD COLUMN backup_directory TEXT;
ALTER TABLE app_settings ADD COLUMN backup_retention_count INTEGER NOT NULL DEFAULT 14;
ALTER TABLE app_settings ADD COLUMN backup_frequency TEXT NOT NULL DEFAULT 'daily';
ALTER TABLE app_settings ADD COLUMN last_backup_at TEXT;
ALTER TABLE app_settings ADD COLUMN last_backup_status TEXT;
ALTER TABLE app_settings ADD COLUMN last_backup_error TEXT;

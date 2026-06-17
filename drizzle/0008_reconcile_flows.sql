-- Log status extension + pantry reconcile timestamp
ALTER TABLE app_settings ADD COLUMN pantry_last_reconciled_at TEXT;

-- Log entry status: eaten vs planned (applied via initDb migrateLogStatus)
ALTER TABLE daily_log_entries ADD COLUMN status TEXT NOT NULL DEFAULT 'eaten';

-- Migration: daily intake logging, goals, and app settings
CREATE TABLE IF NOT EXISTS daily_log_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
  ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE SET NULL,
  meal_type TEXT NOT NULL,
  servings REAL NOT NULL DEFAULT 1,
  logged_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  calorie_target INTEGER NOT NULL DEFAULT 1800,
  protein_target_g INTEGER NOT NULL DEFAULT 150,
  fat_target_g INTEGER NOT NULL DEFAULT 65,
  carb_target_g INTEGER NOT NULL DEFAULT 200
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ollama_base_url TEXT NOT NULL DEFAULT 'http://localhost:11434',
  ollama_model TEXT NOT NULL DEFAULT 'qwen2.5'
);

INSERT OR IGNORE INTO daily_goals (id, calorie_target, protein_target_g, fat_target_g, carb_target_g)
SELECT 1, 1800, 150, 65, 200 WHERE NOT EXISTS (SELECT 1 FROM daily_goals LIMIT 1);

INSERT OR IGNORE INTO app_settings (id, ollama_base_url, ollama_model)
SELECT 1, 'http://localhost:11434', 'qwen2.5' WHERE NOT EXISTS (SELECT 1 FROM app_settings LIMIT 1);

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";

const dbPath = process.env.DATABASE_URL?.replace("file:", "") ?? path.join(process.cwd(), "local.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      default_unit TEXT NOT NULL DEFAULT 'g',
      calories REAL NOT NULL DEFAULT 0,
      protein_g REAL NOT NULL DEFAULT 0,
      fat_g REAL NOT NULL DEFAULT 0,
      carbs_g REAL NOT NULL DEFAULT 0,
      is_processed INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS store_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      package_size REAL NOT NULL,
      package_unit TEXT NOT NULL DEFAULT 'g',
      price_nzd REAL,
      is_preferred INTEGER NOT NULL DEFAULT 0,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      servings INTEGER NOT NULL DEFAULT 1,
      instructions TEXT,
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'g'
    );
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      multiplier REAL NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
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
  `);

  const goalCount = sqlite.prepare("SELECT COUNT(*) as c FROM daily_goals").get() as { c: number };
  if (goalCount.c === 0) {
    sqlite.prepare(
      "INSERT INTO daily_goals (calorie_target, protein_target_g, fat_target_g, carb_target_g) VALUES (1800, 150, 65, 200)",
    ).run();
  }

  const settingsCount = sqlite.prepare("SELECT COUNT(*) as c FROM app_settings").get() as { c: number };
  if (settingsCount.c === 0) {
    sqlite.prepare(
      "INSERT INTO app_settings (ollama_base_url, ollama_model) VALUES ('http://localhost:11434', 'qwen2.5')",
    ).run();
  }
}

initDb();

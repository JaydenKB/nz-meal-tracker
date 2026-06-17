import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import { CONVERSION_REFERENCE } from "@/lib/nutrition/conversion-reference";
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
      status TEXT NOT NULL DEFAULT 'eaten',
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

  migrateRecipesOrigin();
  migrateAppSettingsVisionModel();
  migrateAppSettingsTextModel();
  migrateAppSettingsOpenAI();
  migrateAppSettingsAnthropic();
  migrateIngredientNutrients();
  migrateIngredientPantryFields();
  migratePantryTables();
  migrateLogStatus();
  seedIngredientConversions();
}

function migrateIngredientPantryFields() {
  const cols = sqlite.prepare("PRAGMA table_info(ingredients)").all() as { name: string }[];
  const add = (sql: string) => {
    try {
      sqlite.exec(sql);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("duplicate column")) throw error;
    }
  };
  if (!cols.some((c) => c.name === "canonical_unit")) {
    add("ALTER TABLE ingredients ADD COLUMN canonical_unit TEXT");
  }
  if (!cols.some((c) => c.name === "grams_per_unit")) {
    add("ALTER TABLE ingredients ADD COLUMN grams_per_unit REAL");
  }
  if (!cols.some((c) => c.name === "ml_per_gram")) {
    add("ALTER TABLE ingredients ADD COLUMN ml_per_gram REAL");
  }
}

function migrateLogStatus() {
  const cols = sqlite.prepare("PRAGMA table_info(daily_log_entries)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "status")) {
    try {
      sqlite.exec("ALTER TABLE daily_log_entries ADD COLUMN status TEXT NOT NULL DEFAULT 'eaten'");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("duplicate column")) throw error;
    }
  }
}

function migratePantryTables() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS pantry_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL UNIQUE REFERENCES ingredients(id) ON DELETE CASCADE,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'g',
      is_staple INTEGER NOT NULL DEFAULT 0,
      low_threshold REAL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS pantry_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      delta REAL NOT NULL,
      reason TEXT NOT NULL,
      ref_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function seedIngredientConversions() {
  const rows = sqlite
    .prepare(
      "SELECT id, name, canonical_unit, grams_per_unit, ml_per_gram FROM ingredients",
    )
    .all() as {
    id: number;
    name: string;
    canonical_unit: string | null;
    grams_per_unit: number | null;
    ml_per_gram: number | null;
  }[];

  const update = sqlite.prepare(`
    UPDATE ingredients
    SET canonical_unit = COALESCE(canonical_unit, @canonicalUnit),
        grams_per_unit = COALESCE(grams_per_unit, @gramsPerUnit),
        ml_per_gram = COALESCE(ml_per_gram, @mlPerGram)
    WHERE id = @id
  `);

  for (const row of rows) {
    const lower = row.name.toLowerCase();
    let ref: (typeof CONVERSION_REFERENCE)[number] | null = null;
    let bestLen = 0;
    for (const candidate of CONVERSION_REFERENCE) {
      if (lower.includes(candidate.match) && candidate.match.length > bestLen) {
        ref = candidate;
        bestLen = candidate.match.length;
      }
    }
    if (!ref) continue;

    const needsCanonical = !row.canonical_unit && ref.canonicalUnit;
    const needsGrams = row.grams_per_unit == null && ref.gramsPerEach != null;
    const needsDensity = row.ml_per_gram == null && ref.densityGPerMl != null;
    if (!needsCanonical && !needsGrams && !needsDensity) continue;

    update.run({
      id: row.id,
      canonicalUnit: ref.canonicalUnit ?? null,
      gramsPerUnit: ref.gramsPerEach ?? null,
      mlPerGram: ref.densityGPerMl != null ? 1 / ref.densityGPerMl : null,
    });
  }
}

function migrateAppSettingsTextModel() {
  sqlite
    .prepare(
      "UPDATE app_settings SET ollama_model = 'qwen2.5:7b' WHERE ollama_model IN ('qwen2.5', 'qwen2.5:3b')",
    )
    .run();
}

function migrateIngredientNutrients() {
  const cols = sqlite.prepare("PRAGMA table_info(ingredients)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "nutrients_json")) {
    try {
      sqlite.exec("ALTER TABLE ingredients ADD COLUMN nutrients_json TEXT");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("duplicate column")) throw error;
    }
  }
  if (!cols.some((c) => c.name === "nutrition_source")) {
    try {
      sqlite.exec("ALTER TABLE ingredients ADD COLUMN nutrition_source TEXT");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("duplicate column")) throw error;
    }
  }
}

function migrateAppSettingsVisionModel() {
  const cols = sqlite.prepare("PRAGMA table_info(app_settings)").all() as { name: string }[];
  if (cols.some((c) => c.name === "ollama_vision_model")) return;
  try {
    sqlite.exec(
      "ALTER TABLE app_settings ADD COLUMN ollama_vision_model TEXT NOT NULL DEFAULT 'qwen2.5vl:3b'",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("duplicate column")) throw error;
  }
}

function migrateAppSettingsOpenAI() {
  const cols = sqlite.prepare("PRAGMA table_info(app_settings)").all() as { name: string }[];
  const add = (sql: string) => {
    try {
      sqlite.exec(sql);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("duplicate column")) throw error;
    }
  };
  if (!cols.some((c) => c.name === "ai_provider")) {
    add("ALTER TABLE app_settings ADD COLUMN ai_provider TEXT NOT NULL DEFAULT 'local'");
  }
  if (!cols.some((c) => c.name === "openai_api_key")) {
    add("ALTER TABLE app_settings ADD COLUMN openai_api_key TEXT");
  }
  if (!cols.some((c) => c.name === "openai_text_model")) {
    add("ALTER TABLE app_settings ADD COLUMN openai_text_model TEXT NOT NULL DEFAULT 'gpt-4o-mini'");
  }
  if (!cols.some((c) => c.name === "openai_vision_model")) {
    add("ALTER TABLE app_settings ADD COLUMN openai_vision_model TEXT NOT NULL DEFAULT 'gpt-4o'");
  }
}

function migrateAppSettingsAnthropic() {
  const cols = sqlite.prepare("PRAGMA table_info(app_settings)").all() as { name: string }[];
  const add = (sql: string) => {
    try {
      sqlite.exec(sql);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("duplicate column")) throw error;
    }
  };
  if (!cols.some((c) => c.name === "anthropic_api_key")) {
    add("ALTER TABLE app_settings ADD COLUMN anthropic_api_key TEXT");
  }
  if (!cols.some((c) => c.name === "anthropic_text_model")) {
    add(
      "ALTER TABLE app_settings ADD COLUMN anthropic_text_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514'",
    );
  }
}

function migrateRecipesOrigin() {
  const cols = sqlite.prepare("PRAGMA table_info(recipes)").all() as { name: string }[];
  if (cols.some((c) => c.name === "origin")) return;
  try {
    sqlite.exec("ALTER TABLE recipes ADD COLUMN origin TEXT NOT NULL DEFAULT 'manual'");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("duplicate column")) throw error;
  }
}

initDb();

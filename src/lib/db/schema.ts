import { relations, sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ingredients = sqliteTable("ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  defaultUnit: text("default_unit").notNull().default("g"),
  calories: real("calories").notNull().default(0),
  proteinG: real("protein_g").notNull().default(0),
  fatG: real("fat_g").notNull().default(0),
  carbsG: real("carbs_g").notNull().default(0),
  isProcessed: integer("is_processed", { mode: "boolean" }).notNull().default(false),
  nutrientsJson: text("nutrients_json"),
  nutritionSource: text("nutrition_source"),
  /** Pantry stock is tracked in this unit: g, ml, or each */
  canonicalUnit: text("canonical_unit"),
  /** Grams per countable item when canonical_unit is each */
  gramsPerUnit: real("grams_per_unit"),
  /** Density (ml per gram) for volume ↔ mass when needed */
  mlPerGram: real("ml_per_gram"),
  /** EAN/UPC barcode when added via scan — enables instant re-lookup */
  barcode: text("barcode"),
  /** Soft-delete: hidden from pickers but references remain intact */
  archivedAt: text("archived_at"),
});

export const pantryItems = sqliteTable("pantry_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ingredientId: integer("ingredient_id")
    .notNull()
    .unique()
    .references(() => ingredients.id, { onDelete: "cascade" }),
  quantity: real("quantity").notNull().default(0),
  /** Always matches ingredient canonical unit */
  unit: text("unit").notNull().default("g"),
  isStaple: integer("is_staple", { mode: "boolean" }).notNull().default(false),
  lowThreshold: real("low_threshold"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const PANTRY_TRANSACTION_REASONS = ["bought", "cooked", "manual_adjust"] as const;
export type PantryTransactionReason = (typeof PANTRY_TRANSACTION_REASONS)[number];

export const pantryTransactions = sqliteTable("pantry_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "cascade" }),
  delta: real("delta").notNull(),
  reason: text("reason").notNull(),
  refId: integer("ref_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const stores = sqliteTable("stores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  notes: text("notes"),
  archivedAt: text("archived_at"),
});

export const storeProducts = sqliteTable("store_products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storeId: integer("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  packageSize: real("package_size").notNull(),
  packageUnit: text("package_unit").notNull().default("g"),
  priceNzd: real("price_nzd"),
  isPreferred: integer("is_preferred", { mode: "boolean" }).notNull().default(false),
  notes: text("notes"),
});

export const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  servings: integer("servings").notNull().default(1),
  instructions: text("instructions"),
  imageUrl: text("image_url"),
  origin: text("origin").notNull().default("manual"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  archivedAt: text("archived_at"),
});

export const recipeIngredients = sqliteTable("recipe_ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "cascade" }),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull().default("g"),
});

export const batches = sqliteTable("batches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  multiplier: real("multiplier").notNull().default(1),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const dailyLogEntries = sqliteTable("daily_log_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  ingredientId: integer("ingredient_id").references(() => ingredients.id, { onDelete: "set null" }),
  mealType: text("meal_type").notNull(),
  servings: real("servings").notNull().default(1),
  /** eaten = consumed; planned = future meal not yet eaten */
  status: text("status").notNull().default("eaten"),
  loggedAt: text("logged_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const dailyGoals = sqliteTable("daily_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  calorieTarget: integer("calorie_target").notNull().default(1800),
  proteinTargetG: integer("protein_target_g").notNull().default(150),
  fatTargetG: integer("fat_target_g").notNull().default(65),
  carbTargetG: integer("carb_target_g").notNull().default(200),
});

export const appSettings = sqliteTable("app_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ollamaBaseUrl: text("ollama_base_url").notNull().default("http://localhost:11434"),
  ollamaModel: text("ollama_model").notNull().default("qwen2.5:7b"),
  ollamaVisionModel: text("ollama_vision_model").notNull().default("qwen2.5vl:3b"),
  aiProvider: text("ai_provider").notNull().default("local"),
  openaiApiKey: text("openai_api_key"),
  openaiTextModel: text("openai_text_model").notNull().default("gpt-4o-mini"),
  openaiVisionModel: text("openai_vision_model").notNull().default("gpt-4o"),
  anthropicApiKey: text("anthropic_api_key"),
  anthropicTextModel: text("anthropic_text_model").notNull().default("claude-sonnet-4-20250514"),
  backupEnabled: integer("backup_enabled", { mode: "boolean" }).notNull().default(true),
  backupDirectory: text("backup_directory"),
  backupRetentionCount: integer("backup_retention_count").notNull().default(14),
  backupFrequency: text("backup_frequency").notNull().default("daily"),
  lastBackupAt: text("last_backup_at"),
  lastBackupStatus: text("last_backup_status"),
  lastBackupError: text("last_backup_error"),
  pantryLastReconciledAt: text("pantry_last_reconciled_at"),
});

export type AiProvider = "local" | "openai" | "anthropic";
export const AI_PROVIDERS: AiProvider[] = ["local", "openai", "anthropic"];

export const ingredientsRelations = relations(ingredients, ({ many, one }) => ({
  recipeIngredients: many(recipeIngredients),
  storeProducts: many(storeProducts),
  logEntries: many(dailyLogEntries),
  pantryItem: one(pantryItems, {
    fields: [ingredients.id],
    references: [pantryItems.ingredientId],
  }),
}));

export const pantryItemsRelations = relations(pantryItems, ({ one }) => ({
  ingredient: one(ingredients, {
    fields: [pantryItems.ingredientId],
    references: [ingredients.id],
  }),
}));

export const storesRelations = relations(stores, ({ many }) => ({
  products: many(storeProducts),
}));

export const storeProductsRelations = relations(storeProducts, ({ one }) => ({
  store: one(stores, { fields: [storeProducts.storeId], references: [stores.id] }),
  ingredient: one(ingredients, {
    fields: [storeProducts.ingredientId],
    references: [ingredients.id],
  }),
}));

export const recipesRelations = relations(recipes, ({ many }) => ({
  ingredients: many(recipeIngredients),
  batches: many(batches),
  logEntries: many(dailyLogEntries),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeIngredients.recipeId], references: [recipes.id] }),
  ingredient: one(ingredients, {
    fields: [recipeIngredients.ingredientId],
    references: [ingredients.id],
  }),
}));

export const batchesRelations = relations(batches, ({ one }) => ({
  recipe: one(recipes, { fields: [batches.recipeId], references: [recipes.id] }),
}));

export const dailyLogEntriesRelations = relations(dailyLogEntries, ({ one }) => ({
  recipe: one(recipes, { fields: [dailyLogEntries.recipeId], references: [recipes.id] }),
  ingredient: one(ingredients, {
    fields: [dailyLogEntries.ingredientId],
    references: [ingredients.id],
  }),
}));

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type LogStatus = "eaten" | "planned" | "skipped" | "replaced";
export type RecipeOrigin = "manual" | "ai";
export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
export const LOG_STATUSES: LogStatus[] = ["eaten", "planned", "skipped", "replaced"];

export type Ingredient = typeof ingredients.$inferSelect;
export type PantryItem = typeof pantryItems.$inferSelect;
export type PantryTransaction = typeof pantryTransactions.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type StoreProduct = typeof storeProducts.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type Batch = typeof batches.$inferSelect;
export type DailyLogEntry = typeof dailyLogEntries.$inferSelect;
export type DailyGoals = typeof dailyGoals.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;

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
});

export const stores = sqliteTable("stores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  notes: text("notes"),
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
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
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
  ollamaModel: text("ollama_model").notNull().default("qwen2.5"),
});

export const ingredientsRelations = relations(ingredients, ({ many }) => ({
  recipeIngredients: many(recipeIngredients),
  storeProducts: many(storeProducts),
  logEntries: many(dailyLogEntries),
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
export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export type Ingredient = typeof ingredients.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type StoreProduct = typeof storeProducts.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type Batch = typeof batches.$inferSelect;
export type DailyLogEntry = typeof dailyLogEntries.$inferSelect;
export type DailyGoals = typeof dailyGoals.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;

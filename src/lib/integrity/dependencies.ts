import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  batches,
  dailyLogEntries,
  ingredients,
  pantryItems,
  recipeIngredients,
  recipes,
  storeProducts,
  stores,
} from "@/lib/db/schema";

export type DependencySummary = {
  recipeCount: number;
  recipeNames: string[];
  pantryDisplay: string | null;
  storeProductCount: number;
  logEntryCount: number;
  batchCount: number;
  plannedLogCount: number;
};

export async function getIngredientDependencies(
  ingredientId: number,
): Promise<DependencySummary | null> {
  const ingredient = await db
    .select()
    .from(ingredients)
    .where(eq(ingredients.id, ingredientId))
    .get();
  if (!ingredient) return null;

  const recipeRows = await db
    .select({ name: recipes.name })
    .from(recipeIngredients)
    .innerJoin(recipes, eq(recipeIngredients.recipeId, recipes.id))
    .where(eq(recipeIngredients.ingredientId, ingredientId));

  const pantry = await db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.ingredientId, ingredientId))
    .get();

  const storeCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(storeProducts)
    .where(eq(storeProducts.ingredientId, ingredientId))
    .get();

  const logCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(dailyLogEntries)
    .where(eq(dailyLogEntries.ingredientId, ingredientId))
    .get();

  const pantryDisplay =
    pantry && pantry.quantity > 0 ? `${pantry.quantity}${pantry.unit}` : null;

  return {
    recipeCount: recipeRows.length,
    recipeNames: recipeRows.map((r) => r.name).slice(0, 8),
    pantryDisplay,
    storeProductCount: storeCount?.c ?? 0,
    logEntryCount: logCount?.c ?? 0,
    batchCount: 0,
    plannedLogCount: 0,
  };
}

export async function getRecipeDependencies(recipeId: number): Promise<{
  logEntryCount: number;
  plannedCount: number;
  batchCount: number;
} | null> {
  const recipe = await db.select().from(recipes).where(eq(recipes.id, recipeId)).get();
  if (!recipe) return null;

  const logs = await db
    .select({ status: dailyLogEntries.status, c: sql<number>`count(*)` })
    .from(dailyLogEntries)
    .where(eq(dailyLogEntries.recipeId, recipeId))
    .groupBy(dailyLogEntries.status)
    .all();

  const batchCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(batches)
    .where(eq(batches.recipeId, recipeId))
    .get();

  let logEntryCount = 0;
  let plannedCount = 0;
  for (const row of logs) {
    logEntryCount += row.c;
    if (row.status === "planned") plannedCount += row.c;
  }

  return {
    logEntryCount,
    plannedCount,
    batchCount: batchCount?.c ?? 0,
  };
}

export async function getStoreDependencies(storeId: number): Promise<{ productCount: number } | null> {
  const store = await db.select().from(stores).where(eq(stores.id, storeId)).get();
  if (!store) return null;

  const productCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(storeProducts)
    .where(eq(storeProducts.storeId, storeId))
    .get();

  return { productCount: productCount?.c ?? 0 };
}

export function hasIngredientDependents(d: DependencySummary): boolean {
  return (
    d.recipeCount > 0 ||
    d.pantryDisplay != null ||
    d.storeProductCount > 0 ||
    d.logEntryCount > 0
  );
}

export function hasRecipeDependents(d: {
  logEntryCount: number;
  batchCount: number;
}): boolean {
  return d.logEntryCount > 0 || d.batchCount > 0;
}

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appSettings,
  dailyGoals,
  dailyLogEntries,
  ingredients,
  recipes,
  storeProducts,
} from "@/lib/db/schema";
import type { DailyGoals, AppSettings } from "@/lib/db/schema";
import { computeEntryMacros, type LogEntryWithMeta } from "@/lib/log/compute";

export async function getDailyGoals(): Promise<DailyGoals> {
  const row = await db.select().from(dailyGoals).limit(1).get();
  if (!row) {
    const [created] = await db
      .insert(dailyGoals)
      .values({})
      .returning();
    return created;
  }
  return row;
}

export async function updateDailyGoals(data: Partial<DailyGoals>) {
  const current = await getDailyGoals();
  await db
    .update(dailyGoals)
    .set({
      calorieTarget: data.calorieTarget ?? current.calorieTarget,
      proteinTargetG: data.proteinTargetG ?? current.proteinTargetG,
      fatTargetG: data.fatTargetG ?? current.fatTargetG,
      carbTargetG: data.carbTargetG ?? current.carbTargetG,
    })
    .where(eq(dailyGoals.id, current.id));
  return getDailyGoals();
}

export async function getAppSettings(): Promise<AppSettings> {
  const row = await db.select().from(appSettings).limit(1).get();
  if (!row) {
    const [created] = await db.insert(appSettings).values({}).returning();
    return created;
  }
  return row;
}

export async function updateAppSettings(data: Partial<AppSettings>) {
  const current = await getAppSettings();
  await db
    .update(appSettings)
    .set({
      ollamaBaseUrl: data.ollamaBaseUrl ?? current.ollamaBaseUrl,
      ollamaModel: data.ollamaModel ?? current.ollamaModel,
    })
    .where(eq(appSettings.id, current.id));
  return getAppSettings();
}

import { getRecipeWithDetails } from "@/lib/queries";

export async function getLogEntriesForDate(date: string): Promise<LogEntryWithMeta[]> {
  const rows = await db
    .select()
    .from(dailyLogEntries)
    .where(eq(dailyLogEntries.date, date))
    .orderBy(dailyLogEntries.loggedAt);

  const allIngredients = await db.select().from(ingredients);
  const ingredientMap = Object.fromEntries(allIngredients.map((i) => [i.id, i]));
  const allRecipes = await db.select().from(recipes);
  const recipeMap = Object.fromEntries(allRecipes.map((r) => [r.id, r]));

  const entries: LogEntryWithMeta[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ing = row.ingredientId ? ingredientMap[row.ingredientId] : null;
    let recipePerServing = null;
    if (row.recipeId) {
      const details = await getRecipeWithDetails(row.recipeId);
      recipePerServing = details?.perServing ?? null;
    }
    const macros = computeEntryMacros(row, { ingredient: ing, recipePerServing });

    entries.push({
      id: row.id,
      date: row.date,
      mealType: row.mealType as LogEntryWithMeta["mealType"],
      servings: row.servings,
      loggedAt: row.loggedAt,
      name: row.recipeId
        ? (recipeMap[row.recipeId]?.name ?? "Unknown recipe")
        : (ing?.name ?? "Unknown ingredient"),
      recipeId: row.recipeId,
      ingredientId: row.ingredientId,
      macros,
      accentIndex: i % 3,
    });
  }

  return entries;
}

export async function createLogEntry(data: {
  date: string;
  mealType: string;
  servings: number;
  recipeId?: number | null;
  ingredientId?: number | null;
}) {
  const [entry] = await db
    .insert(dailyLogEntries)
    .values({
      date: data.date,
      mealType: data.mealType,
      servings: data.servings,
      recipeId: data.recipeId ?? null,
      ingredientId: data.ingredientId ?? null,
    })
    .returning();
  return entry;
}

export async function deleteLogEntry(id: number) {
  await db.delete(dailyLogEntries).where(eq(dailyLogEntries.id, id));
}

export type RecipeCostResult = {
  totalCost: number | null;
  perServingCost: number | null;
  pricedCount: number;
  totalIngredients: number;
  unpricedIngredients: string[];
};

export async function getRecipeCost(recipeId: number): Promise<RecipeCostResult> {
  const details = await getRecipeWithDetails(recipeId);
  if (!details) {
    return { totalCost: null, perServingCost: null, pricedCount: 0, totalIngredients: 0, unpricedIngredients: [] };
  }

  const products = await db.select().from(storeProducts);
  let total = 0;
  let pricedCount = 0;
  const unpriced: string[] = [];

  for (const line of details.lines) {
    const preferred = products
      .filter((p) => p.ingredientId === line.ingredient.id)
      .sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred))[0];

    if (!preferred?.priceNzd) {
      unpriced.push(line.ingredient.name);
      continue;
    }

    const packages = estimatePackagesForLine(line.quantity, line.unit, line.ingredient.defaultUnit, preferred);
    total += preferred.priceNzd * packages;
    pricedCount++;
  }

  if (pricedCount === 0) {
    return {
      totalCost: null,
      perServingCost: null,
      pricedCount: 0,
      totalIngredients: details.lines.length,
      unpricedIngredients: unpriced,
    };
  }

  const totalCost = Math.round(total * 100) / 100;
  const perServingCost = Math.round((totalCost / details.recipe.servings) * 100) / 100;

  return {
    totalCost,
    perServingCost,
    pricedCount,
    totalIngredients: details.lines.length,
    unpricedIngredients: unpriced,
  };
}

function estimatePackagesForLine(
  quantity: number,
  unit: string,
  defaultUnit: string,
  product: { packageSize: number; packageUnit: string },
): number {
  try {
    if (defaultUnit === "each" || product.packageUnit === "each") {
      return Math.max(1, Math.ceil(quantity / product.packageSize));
    }
    return Math.max(1, Math.ceil(quantity / product.packageSize));
  } catch {
    return 1;
  }
}

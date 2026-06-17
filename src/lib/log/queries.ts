import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appSettings,
  dailyGoals,
  dailyLogEntries,
  ingredients,
  recipes,
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
      ollamaVisionModel: data.ollamaVisionModel ?? current.ollamaVisionModel,
      aiProvider: data.aiProvider ?? current.aiProvider,
      openaiApiKey:
        data.openaiApiKey !== undefined ? data.openaiApiKey : current.openaiApiKey,
      openaiTextModel: data.openaiTextModel ?? current.openaiTextModel,
      openaiVisionModel: data.openaiVisionModel ?? current.openaiVisionModel,
      anthropicApiKey:
        data.anthropicApiKey !== undefined ? data.anthropicApiKey : current.anthropicApiKey,
      anthropicTextModel: data.anthropicTextModel ?? current.anthropicTextModel,
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

export { getRecipeCost, type RecipeCostResult } from "@/lib/cost/recipe";

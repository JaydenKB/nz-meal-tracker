import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appSettings,
  dailyGoals,
  dailyLogEntries,
  ingredients,
  pantryTransactions,
  recipes,
  type LogStatus,
} from "@/lib/db/schema";
import type { DailyGoals, AppSettings, DailyLogEntry } from "@/lib/db/schema";
import { computeEntryMacros, type LogEntryWithMeta } from "@/lib/log/compute";
import { inferLogStatus } from "@/lib/calendar/week";
import { getLogEntryCost } from "@/lib/cost/entry";
import { deductRecipeFromPantry } from "@/lib/pantry/deduct";
import { getRecipeWithDetails } from "@/lib/queries";

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
      backupEnabled: data.backupEnabled ?? current.backupEnabled,
      backupDirectory:
        data.backupDirectory !== undefined ? data.backupDirectory : current.backupDirectory,
      backupRetentionCount: data.backupRetentionCount ?? current.backupRetentionCount,
      backupFrequency: data.backupFrequency ?? current.backupFrequency,
      lastBackupAt: data.lastBackupAt ?? current.lastBackupAt,
      lastBackupStatus: data.lastBackupStatus ?? current.lastBackupStatus,
      lastBackupError: data.lastBackupError ?? current.lastBackupError,
      pantryLastReconciledAt:
        data.pantryLastReconciledAt !== undefined
          ? data.pantryLastReconciledAt
          : current.pantryLastReconciledAt,
    })
    .where(eq(appSettings.id, current.id));
  return getAppSettings();
}

export async function enrichLogEntries(rows: DailyLogEntry[]): Promise<LogEntryWithMeta[]> {
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
    const { cost, isPartial } = await getLogEntryCost(row);

    entries.push({
      id: row.id,
      date: row.date,
      mealType: row.mealType as LogEntryWithMeta["mealType"],
      status: (row.status ?? "eaten") as LogStatus,
      servings: row.servings,
      loggedAt: row.loggedAt,
      name: row.recipeId
        ? (recipeMap[row.recipeId]?.name ?? "Unknown recipe")
        : (ing?.name ?? "Unknown ingredient"),
      recipeId: row.recipeId,
      ingredientId: row.ingredientId,
      macros,
      accentIndex: i % 3,
      entryCost: cost,
      costPartial: isPartial,
    });
  }

  return entries;
}

export async function getLogEntriesForDate(date: string): Promise<LogEntryWithMeta[]> {
  const rows = await db
    .select()
    .from(dailyLogEntries)
    .where(eq(dailyLogEntries.date, date))
    .orderBy(dailyLogEntries.loggedAt);

  return enrichLogEntries(rows);
}

export async function createLogEntry(data: {
  date: string;
  mealType: string;
  servings: number;
  recipeId?: number | null;
  ingredientId?: number | null;
  status?: LogStatus;
}) {
  const status = data.status ?? inferLogStatus(data.date);
  const [entry] = await db
    .insert(dailyLogEntries)
    .values({
      date: data.date,
      mealType: data.mealType,
      servings: data.servings,
      recipeId: data.recipeId ?? null,
      ingredientId: data.ingredientId ?? null,
      status,
    })
    .returning();
  return entry;
}

export async function deleteLogEntry(id: number) {
  await db.delete(dailyLogEntries).where(eq(dailyLogEntries.id, id));
}

export async function hasPantryDeductionForLogEntry(logEntryId: number): Promise<boolean> {
  const row = await db
    .select()
    .from(pantryTransactions)
    .where(eq(pantryTransactions.refId, logEntryId))
    .get();
  return Boolean(row);
}

export async function markLogEntryEaten(id: number) {
  const row = await db.select().from(dailyLogEntries).where(eq(dailyLogEntries.id, id)).get();
  if (!row) return { entry: null, pantryDeduction: undefined };

  if (row.status === "eaten") {
    return { entry: row, pantryDeduction: undefined };
  }

  const [entry] = await db
    .update(dailyLogEntries)
    .set({ status: "eaten" })
    .where(eq(dailyLogEntries.id, id))
    .returning();

  let pantryDeduction;
  if (entry.recipeId) {
    const already = await hasPantryDeductionForLogEntry(id);
    if (!already) {
      pantryDeduction = await deductRecipeFromPantry(entry.recipeId, entry.servings, entry.id);
    }
  }

  return { entry, pantryDeduction };
}

export { getRecipeCost, type RecipeCostResult } from "@/lib/cost/recipe";

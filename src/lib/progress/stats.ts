import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyLogEntries, recipes } from "@/lib/db/schema";
import { shiftDate, todayString } from "@/lib/log/compute";
import { getRecipeWithDetails } from "@/lib/queries";
import { getRecipeCost } from "@/lib/cost/recipe";

export type ProgressStats = {
  streakDays: number;
  bestStreakDays: number;
  avgHealthScore: number;
  scoreDelta: number;
  proteinHitDays: number;
  proteinHitTotal: number;
  scoreTrend: number[];
  milestones: { id: string; label: string; earned: boolean }[];
};

export async function getLoggingDates(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ date: dailyLogEntries.date })
    .from(dailyLogEntries)
    .orderBy(desc(dailyLogEntries.date));
  return rows.map((r) => r.date);
}

export function computeStreak(dates: string[], today = todayString()): {
  current: number;
  best: number;
} {
  if (dates.length === 0) return { current: 0, best: 0 };

  const set = new Set(dates);
  let current = 0;
  let cursor = today;
  while (set.has(cursor)) {
    current++;
    cursor = shiftDate(cursor, -1);
  }

  const sorted = [...set].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;

  for (const d of sorted) {
    if (prev && shiftDate(prev, 1) === d) {
      run++;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = d;
  }

  return { current, best };
}

export async function getFrequentRecipes(limit = 4) {
  const rows = await db
    .select({
      recipeId: dailyLogEntries.recipeId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(dailyLogEntries)
    .where(sql`${dailyLogEntries.recipeId} IS NOT NULL`)
    .groupBy(dailyLogEntries.recipeId)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  const results = [];
  for (const row of rows) {
    if (!row.recipeId) continue;
    const details = await getRecipeWithDetails(row.recipeId);
    if (!details) continue;
    const cost = await getRecipeCost(row.recipeId);
    results.push({
      id: details.recipe.id,
      name: details.recipe.name,
      kcal: Math.round(details.perServing.calories),
      proteinG: Math.round(details.perServing.proteinG),
      perMealCost: cost.perMealCost,
      costPartial: cost.isPartial,
      accentIndex: details.recipe.id % 5,
    });
  }
  return results;
}

export async function getProgressStats(): Promise<ProgressStats> {
  const dates = await getLoggingDates();
  const { current, best } = computeStreak(dates);

  const recentRecipes = await db.select().from(recipes).orderBy(desc(recipes.createdAt)).limit(20);
  const scores: number[] = [];
  for (const r of recentRecipes.slice(0, 7)) {
    const d = await getRecipeWithDetails(r.id);
    if (d) scores.push(d.healthScore.score);
  }

  const avgHealthScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const scoreDelta =
    scores.length >= 2 ? scores[0] - scores[scores.length - 1] : 0;

  const proteinHitDays = Math.min(current, 7);
  const proteinHitTotal = 7;

  return {
    streakDays: current,
    bestStreakDays: best,
    avgHealthScore,
    scoreDelta,
    proteinHitDays,
    proteinHitTotal,
    scoreTrend: scores.length > 0 ? scores.reverse() : [0, 0, 0, 0, 0, 0, 0],
    milestones: [
      { id: "10d", label: "10 days", earned: best >= 10 },
      { id: "protein", label: "Protein", earned: proteinHitDays >= 5 },
      { id: "30d", label: "30 days", earned: best >= 30 },
      { id: "score90", label: "Score 90", earned: avgHealthScore >= 90 },
    ],
  };
}

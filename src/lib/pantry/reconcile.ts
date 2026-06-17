import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pantryItems, pantryTransactions } from "@/lib/db/schema";
import { fromCanonicalForDisplay } from "@/lib/pantry/canonical";
import type { Ingredient } from "@/lib/db/schema";
import {
  getPantryRows,
  pantryDisplayQuantity,
  pantryStockLevel,
  setPantryQuantity,
} from "@/lib/pantry/queries";
import { getAppSettings, updateAppSettings } from "@/lib/log/queries";
import { revalidatePath } from "next/cache";

const MIN_DAYS_SINCE_RECONCILE = 14;
const MIN_DEDUCTIONS_SINCE_RECONCILE = 8;

export type ReconcileItem = {
  ingredientId: number;
  name: string;
  quantity: number;
  unit: string;
  displayQty: string;
  isStaple: boolean;
  stockLevel: "low" | "ok";
  likelyWrong: boolean;
  likelyWrongReason?: string;
  deductionCount: number;
};

export type PantryDriftStatus = {
  needsCheck: boolean;
  lastReconciledAt: string | null;
  daysSinceReconcile: number | null;
  deductionsSinceReconcile: number;
  mealsCookedSinceReconcile: number;
};

export async function countCookedDeductionsSince(since: string | null): Promise<number> {
  const where = since
    ? and(
        eq(pantryTransactions.reason, "cooked"),
        sql`${pantryTransactions.createdAt} >= ${since}`,
      )
    : eq(pantryTransactions.reason, "cooked");

  const row = await db
    .select({ c: sql<number>`count(*)` })
    .from(pantryTransactions)
    .where(where)
    .get();
  return row?.c ?? 0;
}

export async function getPantryDriftStatus(): Promise<PantryDriftStatus> {
  const settings = await getAppSettings();
  const lastReconciledAt = settings.pantryLastReconciledAt ?? null;
  const deductionsSinceReconcile = await countCookedDeductionsSince(lastReconciledAt);

  let daysSinceReconcile: number | null = null;
  if (lastReconciledAt) {
    const ms = Date.now() - new Date(lastReconciledAt).getTime();
    daysSinceReconcile = Math.floor(ms / (24 * 60 * 60 * 1000));
  }

  const needsCheck =
    (daysSinceReconcile == null || daysSinceReconcile >= MIN_DAYS_SINCE_RECONCILE) &&
    deductionsSinceReconcile >= MIN_DEDUCTIONS_SINCE_RECONCILE;

  return {
    needsCheck,
    lastReconciledAt,
    daysSinceReconcile,
    deductionsSinceReconcile,
    mealsCookedSinceReconcile: Math.ceil(deductionsSinceReconcile / 3),
  };
}

async function deductionCountsByIngredient(since: string | null): Promise<Map<number, number>> {
  const rows = await db
    .select({
      ingredientId: pantryTransactions.ingredientId,
      c: sql<number>`count(*)`,
    })
    .from(pantryTransactions)
    .where(
      since
        ? and(
            eq(pantryTransactions.reason, "cooked"),
            sql`${pantryTransactions.createdAt} >= ${since}`,
          )
        : eq(pantryTransactions.reason, "cooked"),
    )
    .groupBy(pantryTransactions.ingredientId)
    .all();

  return new Map(rows.map((r) => [r.ingredientId, r.c]));
}

export async function getReconcileCandidates(showAll = false): Promise<ReconcileItem[]> {
  const settings = await getAppSettings();
  const since = settings.pantryLastReconciledAt ?? null;
  const deductionMap = await deductionCountsByIngredient(since);
  const rows = await getPantryRows();

  const scored = rows.map((row) => {
    const stockLevel = pantryStockLevel(row);
    const deductionCount = deductionMap.get(row.ingredientId) ?? 0;
    const likelyWrong =
      stockLevel === "low" ||
      (row.isStaple && deductionCount >= 2) ||
      (row.lowThreshold != null && row.quantity <= row.lowThreshold * 1.25);

    let likelyWrongReason: string | undefined;
    if (stockLevel === "low") likelyWrongReason = "often runs out early";
    else if (row.isStaple) likelyWrongReason = "staple · high churn";

    const score =
      (row.isStaple ? 3 : 0) +
      (stockLevel === "low" ? 4 : 0) +
      Math.min(deductionCount, 5) +
      (likelyWrong ? 1 : 0);

    return {
      ingredientId: row.ingredientId,
      name: row.ingredient.name,
      quantity: row.quantity,
      unit: row.unit,
      displayQty: pantryDisplayQuantity(row),
      isStaple: row.isStaple,
      stockLevel,
      likelyWrong,
      likelyWrongReason,
      deductionCount,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  if (showAll) {
    return scored.map(({ score: _s, ...rest }) => rest);
  }

  return scored.slice(0, 12).map(({ score: _s, ...rest }) => rest);
}

export async function markPantryReconciledServer(): Promise<void> {
  await updateAppSettings({ pantryLastReconciledAt: new Date().toISOString() });
  revalidatePath("/shop/pantry");
  revalidatePath("/recipes/cook-from-pantry");
  revalidatePath("/shop");
  revalidatePath("/");
}

export async function applyReconcileCorrections(
  corrections: { ingredientId: number; quantity: number; unit: string }[],
): Promise<number> {
  let changed = 0;
  await db.transaction(async () => {
    for (const c of corrections) {
      const before = await db
        .select()
        .from(pantryItems)
        .where(eq(pantryItems.ingredientId, c.ingredientId))
        .get();
      if (!before) continue;
      if (Math.abs(before.quantity - c.quantity) < 0.01 && before.unit === c.unit) continue;

      await setPantryQuantity({
        ingredientId: c.ingredientId,
        quantity: c.quantity,
        unit: c.unit,
      });
      changed++;
    }
  });

  await markPantryReconciledServer();
  return changed;
}

export function displayToEditable(
  quantity: number,
  unit: string,
  ingredient: Ingredient,
): { quantity: number; unit: string } {
  const display = fromCanonicalForDisplay(quantity, ingredient);
  return { quantity: display.quantity, unit: display.unit };
}

export function formatReconcileAgo(iso: string | null): string {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

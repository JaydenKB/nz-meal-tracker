import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  ingredients,
  pantryItems,
  pantryTransactions,
  type Ingredient,
  type PantryItem,
  type PantryTransactionReason,
} from "@/lib/db/schema";
import {
  formatCanonicalAmount,
  getCanonicalUnit,
  toCanonicalAmount,
  type CanonicalUnit,
} from "@/lib/pantry/canonical";

export type PantryRow = PantryItem & { ingredient: Ingredient };

export async function getPantryRows(): Promise<PantryRow[]> {
  const rows = await db
    .select()
    .from(pantryItems)
    .innerJoin(ingredients, eq(pantryItems.ingredientId, ingredients.id))
    .orderBy(ingredients.name);

  return rows.map((r) => ({
    ...r.pantry_items,
    ingredient: r.ingredients,
  }));
}

export async function getPantryMap(): Promise<Map<number, PantryRow>> {
  const rows = await getPantryRows();
  return new Map(rows.map((r) => [r.ingredientId, r]));
}

export async function getPantryItemByIngredient(ingredientId: number): Promise<PantryRow | null> {
  const row = await db
    .select()
    .from(pantryItems)
    .innerJoin(ingredients, eq(pantryItems.ingredientId, ingredients.id))
    .where(eq(pantryItems.ingredientId, ingredientId))
    .get();

  if (!row) return null;
  return { ...row.pantry_items, ingredient: row.ingredients };
}

async function recordTransaction(
  ingredientId: number,
  delta: number,
  reason: PantryTransactionReason,
  refId?: number | null,
) {
  await db.insert(pantryTransactions).values({
    ingredientId,
    delta,
    reason,
    refId: refId ?? null,
  });
}

export async function upsertPantryStock(input: {
  ingredientId: number;
  quantity: number;
  unit: string;
  isStaple?: boolean;
  lowThreshold?: number | null;
  reason: PantryTransactionReason;
  refId?: number | null;
}): Promise<PantryRow> {
  const ingredient = await db
    .select()
    .from(ingredients)
    .where(eq(ingredients.id, input.ingredientId))
    .get();
  if (!ingredient) throw new Error("Ingredient not found");

  const converted = toCanonicalAmount(input.quantity, input.unit, ingredient);
  if (!converted.ok) {
    throw new Error(`Cannot convert ${input.quantity} ${input.unit} for ${ingredient.name}`);
  }

  const canonical = getCanonicalUnit(ingredient);
  const existing = await db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.ingredientId, input.ingredientId))
    .get();

  const delta = converted.amount;

  if (existing) {
    const newQty = Math.max(0, existing.quantity + delta);
    await db
      .update(pantryItems)
      .set({
        quantity: newQty,
        unit: canonical,
        isStaple: input.isStaple ?? existing.isStaple,
        lowThreshold: input.lowThreshold !== undefined ? input.lowThreshold : existing.lowThreshold,
        updatedAt: sql`(datetime('now'))`,
      })
      .where(eq(pantryItems.id, existing.id));
    await recordTransaction(input.ingredientId, delta, input.reason, input.refId);
  } else {
    await db.insert(pantryItems).values({
      ingredientId: input.ingredientId,
      quantity: Math.max(0, delta),
      unit: canonical,
      isStaple: input.isStaple ?? false,
      lowThreshold: input.lowThreshold ?? null,
    });
    await recordTransaction(input.ingredientId, delta, input.reason, input.refId);
  }

  const row = await getPantryItemByIngredient(input.ingredientId);
  if (!row) throw new Error("Failed to save pantry item");
  return row;
}

export async function setPantryQuantity(input: {
  ingredientId: number;
  quantity: number;
  unit: string;
  isStaple?: boolean;
  lowThreshold?: number | null;
}): Promise<PantryRow> {
  const ingredient = await db
    .select()
    .from(ingredients)
    .where(eq(ingredients.id, input.ingredientId))
    .get();
  if (!ingredient) throw new Error("Ingredient not found");

  const converted = toCanonicalAmount(input.quantity, input.unit, ingredient);
  if (!converted.ok) {
    throw new Error(`Cannot convert amount for ${ingredient.name}`);
  }

  const canonical = getCanonicalUnit(ingredient);
  const existing = await db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.ingredientId, input.ingredientId))
    .get();

  const newQty = Math.max(0, converted.amount);
  const delta = existing ? newQty - existing.quantity : newQty;

  if (existing) {
    await db
      .update(pantryItems)
      .set({
        quantity: newQty,
        unit: canonical,
        isStaple: input.isStaple ?? existing.isStaple,
        lowThreshold: input.lowThreshold !== undefined ? input.lowThreshold : existing.lowThreshold,
        updatedAt: sql`(datetime('now'))`,
      })
      .where(eq(pantryItems.id, existing.id));
  } else {
    await db.insert(pantryItems).values({
      ingredientId: input.ingredientId,
      quantity: newQty,
      unit: canonical,
      isStaple: input.isStaple ?? false,
      lowThreshold: input.lowThreshold ?? null,
    });
  }

  if (delta !== 0) {
    await recordTransaction(input.ingredientId, delta, "manual_adjust");
  }

  const row = await getPantryItemByIngredient(input.ingredientId);
  if (!row) throw new Error("Failed to save pantry item");
  return row;
}

export async function deductCanonicalAmount(
  ingredientId: number,
  amount: number,
  reason: PantryTransactionReason,
  refId?: number | null,
): Promise<{ deducted: number; ranOut: boolean }> {
  const existing = await db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.ingredientId, ingredientId))
    .get();

  if (!existing || existing.quantity <= 0) {
    return { deducted: 0, ranOut: true };
  }

  const deduct = Math.min(existing.quantity, amount);
  const newQty = existing.quantity - deduct;

  await db
    .update(pantryItems)
    .set({
      quantity: newQty,
      updatedAt: sql`(datetime('now'))`,
    })
    .where(eq(pantryItems.id, existing.id));

  await recordTransaction(ingredientId, -deduct, reason, refId);

  return { deducted: deduct, ranOut: amount > deduct };
}

export function pantryStockLevel(item: PantryItem): "low" | "ok" {
  if (item.lowThreshold != null && item.quantity <= item.lowThreshold) {
    return "low";
  }
  return "ok";
}

export function pantryDisplayQuantity(item: PantryRow): string {
  return formatCanonicalAmount(item.quantity, item.unit as CanonicalUnit);
}

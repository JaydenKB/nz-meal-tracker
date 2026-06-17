import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ingredients } from "@/lib/db/schema";
import type {
  RestockConfirmItem,
  RestockConfirmWarning,
} from "@/lib/import/photo-restock-types";
import { upsertPantryStock } from "@/lib/pantry/queries";
import { toCanonicalAmount } from "@/lib/pantry/canonical";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const items = Array.isArray(body.items) ? (body.items as RestockConfirmItem[]) : [];

  if (items.length === 0) {
    return NextResponse.json({ error: "No items to add" }, { status: 400 });
  }

  const results = [];
  const warnings: RestockConfirmWarning[] = [];
  const errors: string[] = [];

  for (const item of items) {
    const ingredientId = Number(item.ingredientId);
    const quantity = Number(item.quantity);
    const unit = String(item.unit ?? "g");

    if (!Number.isFinite(ingredientId) || !Number.isFinite(quantity) || quantity <= 0) {
      warnings.push({
        clientId: item.clientId,
        ingredientId,
        reason: "Invalid quantity — skipped",
      });
      continue;
    }

    const ingredient = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.id, ingredientId))
      .get();

    if (!ingredient) {
      errors.push(`Ingredient #${ingredientId} not found`);
      continue;
    }

    const converted = toCanonicalAmount(quantity, unit, ingredient);
    if (!converted.ok) {
      warnings.push({
        clientId: item.clientId,
        ingredientId,
        reason:
          converted.reason === "unknown_density"
            ? "Can't convert volume to weight — set conversion on ingredient first"
            : converted.reason === "missing_grams_per_unit"
              ? "Can't convert to each — set grams per item on ingredient first"
              : "Unit conversion failed — check amount and unit",
      });
      continue;
    }

    try {
      const row = await upsertPantryStock({
        ingredientId,
        quantity: converted.amount,
        unit: converted.unit,
        reason: "bought",
      });
      results.push(row);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Failed to add item");
    }
  }

  revalidatePath("/shop");
  revalidatePath("/shop/pantry");

  return NextResponse.json({
    added: results.length,
    warnings: warnings.length > 0 ? warnings : undefined,
    errors: errors.length > 0 ? errors : undefined,
  });
}

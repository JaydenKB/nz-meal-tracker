import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { upsertPantryStock } from "@/lib/pantry/queries";

export const runtime = "nodejs";

type BoughtItem = {
  ingredientId: number;
  quantity: number;
  unit: string;
};

export async function POST(request: Request) {
  const body = await request.json();
  const items = Array.isArray(body.items) ? (body.items as BoughtItem[]) : [];
  const batchId = body.batchId != null ? Number(body.batchId) : null;

  if (items.length === 0) {
    return NextResponse.json({ error: "No items to add" }, { status: 400 });
  }

  const results = [];
  const errors: string[] = [];

  for (const item of items) {
    const ingredientId = Number(item.ingredientId);
    const quantity = Number(item.quantity);
    const unit = String(item.unit ?? "g");

    if (!Number.isFinite(ingredientId) || !Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }

    try {
      const row = await upsertPantryStock({
        ingredientId,
        quantity,
        unit,
        reason: "bought",
        refId: batchId,
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
    errors: errors.length > 0 ? errors : undefined,
  });
}

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getPantryRows, setPantryQuantity, upsertPantryStock } from "@/lib/pantry/queries";

export const runtime = "nodejs";

export async function GET() {
  const items = await getPantryRows();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const body = await request.json();
  const ingredientId = Number(body.ingredientId);
  const quantity = Number(body.quantity);
  const unit = String(body.unit ?? "g");
  const mode = body.mode === "set" ? "set" : "add";

  if (!Number.isFinite(ingredientId) || !Number.isFinite(quantity)) {
    return NextResponse.json({ error: "Invalid ingredient or quantity" }, { status: 400 });
  }

  try {
    const item =
      mode === "set"
        ? await setPantryQuantity({
            ingredientId,
            quantity,
            unit,
            isStaple: body.isStaple === true,
            lowThreshold: body.lowThreshold != null ? Number(body.lowThreshold) : null,
          })
        : await upsertPantryStock({
            ingredientId,
            quantity,
            unit,
            isStaple: body.isStaple === true,
            lowThreshold: body.lowThreshold != null ? Number(body.lowThreshold) : null,
            reason: "manual_adjust",
          });

    revalidatePath("/shop");
    revalidatePath("/shop/pantry");
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save pantry item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

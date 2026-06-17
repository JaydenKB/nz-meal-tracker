import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { setPantryQuantity } from "@/lib/pantry/queries";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const pantryItemId = Number(id);
  const body = await request.json();

  const ingredientId = Number(body.ingredientId);
  const quantity = Number(body.quantity);
  const unit = String(body.unit ?? "g");

  if (!Number.isFinite(ingredientId) || !Number.isFinite(quantity)) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  try {
    const item = await setPantryQuantity({
      ingredientId,
      quantity,
      unit,
      isStaple: body.isStaple === true,
      lowThreshold: body.lowThreshold != null ? Number(body.lowThreshold) : null,
    });

    revalidatePath("/shop");
    revalidatePath("/shop/pantry");
    return NextResponse.json({ item, pantryItemId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

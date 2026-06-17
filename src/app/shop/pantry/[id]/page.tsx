import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PantryEditClient } from "@/components/pantry/pantry-edit-client";
import { db } from "@/lib/db";
import { ingredients, pantryItems } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function PantryEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await db
    .select()
    .from(pantryItems)
    .innerJoin(ingredients, eq(pantryItems.ingredientId, ingredients.id))
    .where(eq(pantryItems.id, Number(id)))
    .get();

  if (!row) notFound();

  return (
    <PantryEditClient
      pantryItemId={row.pantry_items.id}
      ingredientId={row.pantry_items.ingredientId}
      name={row.ingredients.name}
      quantity={row.pantry_items.quantity}
      unit={row.pantry_items.unit}
      isStaple={row.pantry_items.isStaple}
      lowThreshold={row.pantry_items.lowThreshold}
    />
  );
}

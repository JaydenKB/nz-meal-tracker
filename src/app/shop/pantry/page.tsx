import { PantryPageClient } from "@/components/pantry/pantry-page-client";
import { getPantryRows, pantryDisplayQuantity, pantryStockLevel } from "@/lib/pantry/queries";

export const dynamic = "force-dynamic";

function stockBarPct(quantity: number, lowThreshold: number | null): number {
  if (lowThreshold != null && lowThreshold > 0) {
    return Math.min(100, Math.round((quantity / (lowThreshold * 2)) * 100));
  }
  return quantity > 0 ? 72 : 8;
}

export default async function PantryPage() {
  const rows = await getPantryRows();

  const items = rows.map((row) => ({
    id: row.id,
    ingredientId: row.ingredientId,
    name: row.ingredient.name,
    quantity: row.quantity,
    unit: row.unit,
    displayQty: pantryDisplayQuantity(row),
    isStaple: row.isStaple,
    lowThreshold: row.lowThreshold,
    stockLevel: pantryStockLevel(row),
    barPct: stockBarPct(row.quantity, row.lowThreshold),
  }));

  return <PantryPageClient items={items} />;
}

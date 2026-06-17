import { GeneratePageClient } from "@/components/generate/generate-page";
import { getPantryMap } from "@/lib/pantry/queries";

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ fromPantry?: string }>;
}) {
  const { fromPantry } = await searchParams;
  let initialSelectedIds: number[] | undefined;

  if (fromPantry) {
    if (fromPantry === "1") {
      const pantry = await getPantryMap();
      initialSelectedIds = [...pantry.values()]
        .filter((p) => p.quantity > 0)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 8)
        .map((p) => p.ingredientId);
    } else {
      initialSelectedIds = fromPantry
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => n > 0);
    }
  }

  return <GeneratePageClient initialSelectedIds={initialSelectedIds} />;
}

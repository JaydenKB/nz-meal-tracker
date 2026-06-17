import { notFound } from "next/navigation";
import { IngredientDetailClient } from "@/components/ingredients/ingredient-detail-client";
import { computeMostUsedIngredients } from "@/lib/calendar/stats";
import { getLogEntriesForDateRange } from "@/lib/calendar/queries";
import { endOfWeek, startOfWeek } from "@/lib/calendar/week";
import { getIngredientDetail } from "@/lib/queries";
import { todayString } from "@/lib/log/compute";

export const dynamic = "force-dynamic";

export default async function IngredientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ weekStart?: string }>;
}) {
  const { id } = await params;
  const { weekStart: weekStartParam } = await searchParams;
  const ingredientId = Number(id);
  const detail = await getIngredientDetail(ingredientId);
  if (!detail) notFound();

  const weekStart = startOfWeek(weekStartParam ?? todayString());
  const weekEnd = endOfWeek(weekStart);
  const entries = await getLogEntriesForDateRange(weekStart, weekEnd);
  const usageRows = await computeMostUsedIngredients(entries);
  const weekUsage = usageRows.find((r) => r.ingredientId === ingredientId) ?? {
    mealCount: 0,
    totalQuantity: 0,
    unit: detail.ingredient.defaultUnit,
    totalCost: null,
  };

  return (
    <IngredientDetailClient
      ingredient={detail.ingredient}
      products={detail.products}
      pantry={detail.pantry}
      weekUsage={{
        mealCount: weekUsage.mealCount,
        totalQuantity: weekUsage.totalQuantity,
        unit: weekUsage.unit,
        totalCost: weekUsage.totalCost,
      }}
    />
  );
}

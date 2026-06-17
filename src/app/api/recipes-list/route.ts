import { NextResponse } from "next/server";
import { getRecentRecipesWithSummary } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET() {
  const recipes = await getRecentRecipesWithSummary(100);
  return NextResponse.json({
    recipes: recipes.map((r) => ({
      id: r.recipe.id,
      name: r.recipe.name,
      type: "recipe" as const,
      kcal: Math.round(r.kcal),
      score: r.score,
      perMealCost: r.perMealCost,
      costPartial: r.costPartial,
    })),
  });
}

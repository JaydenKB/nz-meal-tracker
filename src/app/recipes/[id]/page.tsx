import { notFound } from "next/navigation";
import { RecipeDetailClient } from "@/components/recipes/recipe-detail-client";
import { getRecipeCost } from "@/lib/cost/recipe";
import { getRecipeWithDetails } from "@/lib/queries";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const details = await getRecipeWithDetails(Number(id));

  if (!details) notFound();

  const { recipe, lines, perServing, healthScore, macrosExact, conversion } = details;
  const cost = await getRecipeCost(recipe.id);

  const issueIds = new Set(conversion.issues.map((i) => i.lineId));

  return (
    <RecipeDetailClient
      recipe={{
        id: recipe.id,
        name: recipe.name,
        servings: recipe.servings,
        prepMinutes: null,
        imageUrl: recipe.imageUrl,
      }}
      lines={lines.map((l) => ({
        id: l.id,
        quantity: l.quantity,
        unit: l.unit,
        ingredient: { id: l.ingredient.id, name: l.ingredient.name },
        conversionExact: !issueIds.has(l.id),
      }))}
      perServing={perServing}
      score={healthScore.score}
      instructions={recipe.instructions}
      perMealCost={cost.perMealCost}
      costPartial={cost.isPartial}
      macrosExact={macrosExact}
      inexactCount={conversion.inexactCount}
      firstInexactIngredientId={conversion.inexactIngredientIds[0]}
    />
  );
}

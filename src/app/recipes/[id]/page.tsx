import { notFound } from "next/navigation";
import { RecipeDetailClient } from "@/components/recipes/recipe-detail-client";
import { getRecipeWithDetails } from "@/lib/queries";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const details = await getRecipeWithDetails(Number(id));

  if (!details) notFound();

  const { recipe, lines, perServing, healthScore } = details;

  return (
    <RecipeDetailClient
      recipe={{
        id: recipe.id,
        name: recipe.name,
        servings: recipe.servings,
        prepMinutes: null,
        imageUrl: recipe.imageUrl,
      }}
      lines={lines}
      perServing={perServing}
      score={healthScore.score}
      instructions={recipe.instructions}
    />
  );
}

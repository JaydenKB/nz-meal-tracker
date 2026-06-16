import { notFound } from "next/navigation";
import { SuggestionsClient } from "@/components/recipes/suggestions-client";
import { getRecipeWithDetails } from "@/lib/queries";

export default async function SuggestionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const details = await getRecipeWithDetails(Number(id));
  if (!details) notFound();

  return (
    <SuggestionsClient
      recipeId={details.recipe.id}
      recipeName={details.recipe.name}
      currentScore={details.healthScore.score}
    />
  );
}

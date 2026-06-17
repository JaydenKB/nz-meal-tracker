import { notFound, redirect } from "next/navigation";
import { CookingModeClient } from "@/components/cooking/cooking-mode-client";
import { parseMethodStepsForCooking } from "@/lib/recipes/format-method";
import { getPostCookLowStockHints } from "@/lib/pantry/deduct";
import { getRecipeWithDetails } from "@/lib/queries";

export default async function CookingModePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const details = await getRecipeWithDetails(Number(id));

  if (!details) notFound();

  const steps = parseMethodStepsForCooking(details.recipe.instructions);
  if (steps.length === 0) {
    redirect(`/recipes/${details.recipe.id}`);
  }

  const allIngredients = details.lines.map((line) => ({
    name: line.ingredient.name,
    quantity: line.quantity,
    unit: line.unit,
  }));

  const lowStockHints = await getPostCookLowStockHints(
    details.recipe.id,
    details.recipe.servings,
  );

  return (
    <CookingModeClient
      recipeId={details.recipe.id}
      recipeName={details.recipe.name}
      servings={details.recipe.servings}
      steps={steps}
      allIngredients={allIngredients}
      lowStockHints={lowStockHints}
    />
  );
}

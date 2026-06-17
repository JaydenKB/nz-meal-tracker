import { notFound } from "next/navigation";
import { HealthScoreMethodologyClient } from "@/components/recipes/health-score-methodology-client";
import { getRecipeWithDetails } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HealthScoreMethodologyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const details = await getRecipeWithDetails(Number(id));
  if (!details) notFound();

  return <HealthScoreMethodologyClient recipeId={details.recipe.id} />;
}

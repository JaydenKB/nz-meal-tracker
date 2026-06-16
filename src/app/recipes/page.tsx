import { RecipesTabClient } from "@/components/recipes/recipes-tab";
import { getAllRecipesWithSummary } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const recipes = await getAllRecipesWithSummary();
  return <RecipesTabClient recipes={recipes} />;
}

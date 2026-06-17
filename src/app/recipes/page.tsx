import { RecipesTabClient } from "@/components/recipes/recipes-tab";
import { getCookFromPantryMatches } from "@/lib/pantry/cook-from-pantry";
import { getAllRecipesWithSummary } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const [recipes, pantry] = await Promise.all([
    getAllRecipesWithSummary(),
    getCookFromPantryMatches("all"),
  ]);
  return <RecipesTabClient recipes={recipes} cookNowCount={pantry.cookNowCount} />;
}

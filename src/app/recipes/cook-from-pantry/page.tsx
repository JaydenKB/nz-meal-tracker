import { CookFromPantryClient } from "@/components/recipes/cook-from-pantry-client";
import { getCookFromPantryMatches } from "@/lib/pantry/cook-from-pantry";

export const dynamic = "force-dynamic";

export default async function CookFromPantryPage() {
  const data = await getCookFromPantryMatches("all");

  return (
    <CookFromPantryClient
      cookNow={data.cookNow}
      almost={data.almost}
      notYet={data.notYet}
      pantryIngredientIds={data.inStockIngredientIds}
    />
  );
}

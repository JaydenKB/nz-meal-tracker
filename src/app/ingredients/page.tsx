import { IngredientsPageClient } from "@/components/ingredients/ingredients-page-client";
import { getAllIngredients } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function IngredientsPage() {
  const allIngredients = await getAllIngredients();
  return <IngredientsPageClient ingredients={allIngredients} />;
}

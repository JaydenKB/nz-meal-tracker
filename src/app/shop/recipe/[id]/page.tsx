import { notFound } from "next/navigation";
import { RecipeShortfallShopClient } from "@/components/shop/recipe-shortfall-shop-client";
import { getRecipeShortfallShoppingList } from "@/lib/pantry/cook-from-pantry";

export const dynamic = "force-dynamic";

export default async function RecipeShortfallShopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getRecipeShortfallShoppingList(Number(id));
  if (!data) notFound();

  return (
    <RecipeShortfallShopClient
      recipeId={Number(id)}
      recipeName={data.match.recipeName}
      groups={data.groups}
    />
  );
}

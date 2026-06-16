import Link from "next/link";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getAllIngredients } from "@/lib/queries";

export default async function NewRecipePage() {
  const allIngredients = await getAllIngredients();

  if (allIngredients.length === 0) {
    return (
      <div className="space-y-5 text-center">
        <PageHeader title="New recipe" subtitle="Add ingredients first" showIcons={false} />
        <p className="text-sm text-[var(--muted)]">
          You need at least one ingredient before creating a recipe.
        </p>
        <Link href="/ingredients">
          <Button className="w-full">Go to ingredients</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="New recipe" subtitle="Build a healthy meal" />
      <RecipeForm ingredients={allIngredients} />
    </div>
  );
}

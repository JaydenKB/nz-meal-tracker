import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { Button } from "@/components/ui/button";
import { getAllIngredients } from "@/lib/queries";

export default async function NewRecipePage() {
  const allIngredients = await getAllIngredients();

  if (allIngredients.length === 0) {
    return (
      <div className="mx-auto max-w-[430px] space-y-5 text-center">
        <header className="flex items-center gap-3 text-left">
          <Link
            href="/recipes"
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-[1.75rem] font-medium">New recipe</h1>
        </header>
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
    <div className="mx-auto max-w-[430px] space-y-5 pb-24">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/recipes"
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-[1.75rem] font-medium">New recipe</h1>
        </div>
        <Button type="submit" form="recipe-form" size="sm">
          Save
        </Button>
      </header>
      <RecipeForm ingredients={allIngredients} />
    </div>
  );
}

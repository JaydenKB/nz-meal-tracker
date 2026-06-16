import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ServerStatusBar } from "@/components/layout/server-status-bar";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/card";
import { seedDatabase } from "@/lib/db/seed";
import { getRecipeAccent } from "@/lib/theme";
import {
  getIngredientCount,
  getRecentRecipesWithSummary,
  getRecipeCount,
} from "@/lib/queries";

export default async function HomePage() {
  await seedDatabase();

  const [recentRecipes, recipeCount, ingredientCount] = await Promise.all([
    getRecentRecipesWithSummary(),
    getRecipeCount(),
    getIngredientCount(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Kia ora, Jayden" subtitle="Auckland · home WiFi" />

      <ServerStatusBar />

      <div className="grid grid-cols-2 gap-3">
        <StatCard value={recipeCount} label="recipes" />
        <StatCard value={ingredientCount} label="ingredients" />
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Recent recipes</h2>
        {recentRecipes.length === 0 ? (
          <p className="rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
            No recipes yet. Create your first one!
          </p>
        ) : (
          <div className="space-y-2.5">
            {recentRecipes.map(({ recipe, kcal, score }, index) => (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
                <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white px-3.5 py-3.5 transition-shadow hover:shadow-sm">
                  <div
                    className="h-11 w-11 shrink-0 rounded-xl"
                    style={{ backgroundColor: getRecipeAccent(index) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{recipe.name}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {Math.round(kcal)} kcal · score {score}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Link href="/recipes/new" className="block pt-1">
        <Button size="lg" className="w-full">
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          New recipe
        </Button>
      </Link>
    </div>
  );
}

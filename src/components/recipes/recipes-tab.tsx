"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChefHat, Plus, Search, Sparkles } from "lucide-react";
import { TabHeader } from "@/components/layout/tab-header";
import { PullToRefresh } from "@/components/motion/pull-to-refresh";
import { AiTag, HealthScoreBadgeLink } from "@/components/recipes/health-score-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { RecipeImage } from "@/components/ui/recipe-image";
import { MealPriceText } from "@/components/recipes/meal-price-text";

type RecipeItem = {
  recipe: {
    id: number;
    name: string;
    servings: number;
    origin: string | null;
    imageUrl: string | null;
  };
  kcal: number;
  proteinG: number;
  score: number;
  perMealCost: number | null;
  costPartial: boolean;
};

export function RecipesTabClient({
  recipes,
  cookNowCount = 0,
}: {
  recipes: RecipeItem[];
  cookNowCount?: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.recipe.name.toLowerCase().includes(q));
  }, [query, recipes]);

  const [featured, ...rest] = filtered;
  const isSearchEmpty = recipes.length > 0 && filtered.length === 0;

  return (
    <PullToRefresh onRefresh={() => router.refresh()}>
      <div className="mx-auto max-w-[430px] space-y-5">
        <TabHeader title="Recipes" />

        <div className="grid grid-cols-2 gap-2.5">
          <Link href="/recipes/new">
            <Button className="w-full" size="default">
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              New
            </Button>
          </Link>
          <Link href="/generate">
            <Button variant="ai" className="w-full" size="default">
              <Sparkles className="h-4 w-4" strokeWidth={2} />
              Generate
            </Button>
          </Link>
        </div>

        <Link href="/recipes/cook-from-pantry">
          <Button variant="secondary" className="w-full">
            <ChefHat className="h-4 w-4" strokeWidth={2} />
            Cook from pantry
            {cookNowCount > 0 && (
              <span className="ml-1 rounded-full bg-[var(--green-soft)] px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                {cookNowCount} ready
              </span>
            )}
          </Button>
        </Link>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes"
            className="bg-[var(--beige)] pl-10"
          />
        </div>

        {isSearchEmpty ? (
          <EmptyState
            icon={Search}
            iconTone="blue"
            title="No matches"
            body="Try a different search term, or create a new recipe for this meal."
            actions={[
              { label: "Clear search", onClick: () => setQuery(""), variant: "secondary" },
              { label: "New recipe", href: "/recipes/new" },
            ]}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ChefHat}
            iconTone="mint"
            title="Your recipe box is empty"
            body="Save meals you love — log them in one tap and cook from what’s in your pantry."
            actions={[
              { label: "Create a recipe", href: "/recipes/new" },
              { label: "Generate with AI", href: "/generate", variant: "ai" },
            ]}
            tip="Tip: generate from ingredients you already have at home."
          />
        ) : (
          <div className="space-y-3">
            {featured && (
              <article className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
                <div className="relative aspect-[1.4/1] overflow-hidden bg-[var(--mint-hero)]">
                  <Link
                    href={`/recipes/${featured.recipe.id}`}
                    className="block h-full w-full"
                  >
                    {featured.recipe.origin === "ai" && (
                      <AiTag className="absolute left-3 top-3 z-[1]" />
                    )}
                    <RecipeImage
                      recipeId={featured.recipe.id}
                      name={featured.recipe.name}
                      imageUrl={featured.recipe.imageUrl}
                    />
                  </Link>
                  <HealthScoreBadgeLink
                    recipeId={featured.recipe.id}
                    score={featured.score}
                    className="absolute bottom-3 right-3 z-10"
                  />
                </div>
                <Link
                  href={`/recipes/${featured.recipe.id}`}
                  className="block space-y-1 px-4 py-3.5"
                >
                  <h3 className="font-medium text-[var(--foreground)]">{featured.recipe.name}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    {Math.round(featured.kcal)} kcal · {Math.round(featured.proteinG)}g protein ·{" "}
                    {featured.recipe.servings} servings
                    {featured.perMealCost != null && (
                      <>
                        {" · "}
                        <MealPriceText
                          perMealCost={featured.perMealCost}
                          isPartial={featured.costPartial}
                          variant="short"
                          className="text-[var(--muted)]"
                        />
                      </>
                    )}
                  </p>
                </Link>
              </article>
            )}

            {rest.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5">
                {rest.map(({ recipe, kcal, proteinG, score, perMealCost, costPartial }, i) => (
                  <article
                    key={recipe.id}
                    className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[var(--mint-hero)]">
                      <Link href={`/recipes/${recipe.id}`} className="block h-full w-full">
                        {recipe.origin === "ai" && (
                          <AiTag className="absolute left-2 top-2 z-[1]" />
                        )}
                        <RecipeImage
                          recipeId={recipe.id}
                          name={recipe.name}
                          imageUrl={recipe.imageUrl}
                          accentIndex={i}
                        />
                      </Link>
                      <HealthScoreBadgeLink
                        recipeId={recipe.id}
                        score={score}
                        size="sm"
                        className="absolute bottom-2 right-2 z-10"
                      />
                    </div>
                    <Link href={`/recipes/${recipe.id}`} className="block space-y-0.5 px-3 py-2.5">
                      <h3 className="truncate text-sm font-medium">{recipe.name}</h3>
                      <p className="text-xs text-[var(--muted)]">
                        {Math.round(kcal)} kcal · {Math.round(proteinG)}g
                        {perMealCost != null && (
                          <>
                            {" · "}
                            <MealPriceText
                              perMealCost={perMealCost}
                              isPartial={costPartial}
                              variant="short"
                              className="text-[var(--muted)]"
                            />
                          </>
                        )}
                      </p>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}

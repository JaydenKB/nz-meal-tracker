"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Plus, Search, Sparkles } from "lucide-react";
import { TabHeader } from "@/components/layout/tab-header";
import { AiTag, HealthScoreBadge } from "@/components/recipes/health-score-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MealPriceText } from "@/components/recipes/meal-price-text";
import { getRecipeAccent } from "@/lib/theme";

function RecipeCardImage({
  recipeId,
  name,
  imageUrl,
  accentIndex = 0,
}: {
  recipeId: number;
  name: string;
  imageUrl: string | null;
  accentIndex?: number;
}) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={name}
        fill
        className="object-cover"
        sizes="(max-width: 430px) 50vw"
        unoptimized
      />
    );
  }

  return (
    <div
      className="h-full w-full"
      style={{ backgroundColor: getRecipeAccent(recipeId + accentIndex) }}
    />
  );
}

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

export function RecipesTabClient({ recipes }: { recipes: RecipeItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.recipe.name.toLowerCase().includes(q));
  }, [query, recipes]);

  const [featured, ...rest] = filtered;

  return (
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

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes"
          className="bg-[var(--beige)] pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          No recipes yet. Create or generate one!
        </p>
      ) : (
        <div className="space-y-3">
          {featured && (
            <Link href={`/recipes/${featured.recipe.id}`}>
              <article className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-white">
                <div className="relative aspect-[1.4/1] overflow-hidden bg-[var(--mint-hero)]">
                  {featured.recipe.origin === "ai" && (
                    <AiTag className="absolute left-3 top-3 z-10" />
                  )}
                  <RecipeCardImage
                    recipeId={featured.recipe.id}
                    name={featured.recipe.name}
                    imageUrl={featured.recipe.imageUrl}
                  />
                  <HealthScoreBadge score={featured.score} className="absolute bottom-3 right-3 z-10" />
                </div>
                <div className="space-y-1 px-4 py-3.5">
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
                </div>
              </article>
            </Link>
          )}

          {rest.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              {rest.map(({ recipe, kcal, proteinG, score, perMealCost, costPartial }, i) => (
                <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
                  <article className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-white">
                    <div className="relative aspect-square overflow-hidden bg-[var(--mint-hero)]">
                      {recipe.origin === "ai" && (
                        <AiTag className="absolute left-2 top-2 z-10" />
                      )}
                      <RecipeCardImage
                        recipeId={recipe.id}
                        name={recipe.name}
                        imageUrl={recipe.imageUrl}
                        accentIndex={i}
                      />
                      <HealthScoreBadge score={score} size="sm" className="absolute bottom-2 right-2 z-10" />
                    </div>
                    <div className="space-y-0.5 px-3 py-2.5">
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
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

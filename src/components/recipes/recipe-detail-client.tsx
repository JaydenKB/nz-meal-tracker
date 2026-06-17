"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AiPhotoPill } from "@/components/recipes/ai-photo-pill";
import { ArrowLeft, ChefHat, ImageIcon, Plus, Sparkles } from "lucide-react";
import Image from "next/image";
import { createBatch } from "@/app/actions";
import { HealthScoreBadgeLink } from "@/components/recipes/health-score-badge";
import { MacroTiles } from "@/components/recipes/macro-grid";
import { MealPriceText } from "@/components/recipes/meal-price-text";
import { Button } from "@/components/ui/button";
import { mealTypeFromTime } from "@/lib/log/mealTime";
import { todayString } from "@/lib/log/compute";
import { logMealWithRewards } from "@/lib/sfx/log-rewards";
import { parseMethodSteps } from "@/lib/recipes/format-method";
import type { Macros } from "@/lib/nutrition/calculate";

type Line = {
  id: number;
  quantity: number;
  unit: string;
  ingredient: { name: string };
};

export function RecipeDetailClient({
  recipe,
  lines,
  perServing,
  score,
  instructions,
  perMealCost,
  costPartial,
}: {
  recipe: {
    id: number;
    name: string;
    servings: number;
    prepMinutes: number | null;
    imageUrl: string | null;
  };
  lines: Line[];
  perServing: Macros;
  score: number;
  instructions: string | null;
  perMealCost: number | null;
  costPartial: boolean;
}) {
  const router = useRouter();
  const methodSteps = parseMethodSteps(instructions);

  async function handleLog() {
    const date = todayString();
    await logMealWithRewards(date, "eaten", () =>
      fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          mealType: mealTypeFromTime(),
          servings: 1,
          recipeId: recipe.id,
          status: "eaten",
        }),
      }),
    );
    router.push("/");
    router.refresh();
  }

  return (
    <div className="-mx-5 pb-24">
      <div className="relative aspect-[1.05/1] w-full bg-[var(--mint-hero)]">
        {recipe.imageUrl ? (
          <Image
            src={recipe.imageUrl}
            alt={recipe.name}
            fill
            className="object-cover"
            priority
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex h-16 w-20 items-center justify-center rounded-2xl border-2 border-[var(--primary)]/20 bg-white/40">
              <ImageIcon className="h-8 w-8 text-[var(--primary)]/50" strokeWidth={1.5} />
            </div>
          </div>
        )}
        <Link
          href="/recipes"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--foreground)]"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
        </Link>
        <div className="absolute right-4 top-4">
          <AiPhotoPill recipeId={recipe.id} hasImage={Boolean(recipe.imageUrl)} />
        </div>
      </div>

      <div className="space-y-5 px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[1.65rem] font-medium leading-tight text-[var(--foreground)]">
              {recipe.name}
            </h1>
            <p className="mt-1 text-sm font-normal text-[var(--muted)]">
              {recipe.servings} servings
              {recipe.prepMinutes ? ` · ${recipe.prepMinutes} min` : ""}
            </p>
          </div>
          <HealthScoreBadgeLink recipeId={recipe.id} score={score} />
        </div>

        <MacroTiles perServing={perServing} />

        {perMealCost != null && (
          <MealPriceText
            perMealCost={perMealCost}
            isPartial={costPartial}
            variant="prominent"
          />
        )}

        {methodSteps.length > 0 && (
          <Link href={`/recipes/${recipe.id}/cook`} className="block">
            <Button size="lg" variant="outline" className="w-full">
              <ChefHat className="h-5 w-5" strokeWidth={2} />
              Start cooking
            </Button>
          </Link>
        )}

        <Button size="lg" className="w-full" onClick={handleLog}>
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          Log this
        </Button>

        <div className="grid grid-cols-3 gap-2">
          <form action={createBatch} className="contents">
            <input type="hidden" name="recipeId" value={recipe.id} />
            <input type="hidden" name="label" value={`${recipe.name} batch`} />
            <input type="hidden" name="multiplier" value={4} />
            <Button type="submit" variant="secondary" className="w-full">
              Batch
            </Button>
          </form>
          <Link href={`/recipes/${recipe.id}/suggestions`} className="contents">
            <Button variant="ai" className="w-full">
              <Sparkles className="h-4 w-4" />
              Improve
            </Button>
          </Link>
          <Link href="/recipes/new" className="contents">
            <Button variant="secondary" className="w-full">
              Edit
            </Button>
          </Link>
        </div>

        <section>
          <h2 className="mb-2 text-base font-medium text-[var(--foreground)]">Ingredients</h2>
          <div className="divide-y divide-[var(--border)] rounded-[var(--radius-card)] border border-[var(--border)] bg-white">
            {lines.map((line) => (
              <div
                key={line.id}
                className="flex justify-between px-4 py-3.5 text-sm text-[var(--foreground)]"
              >
                <span>{line.ingredient.name}</span>
                <span className="font-normal text-[var(--muted)]">
                  {line.quantity} {line.unit}
                </span>
              </div>
            ))}
          </div>
        </section>

        {methodSteps.length > 0 && (
          <section>
            <h2 className="mb-2 text-base font-medium text-[var(--foreground)]">Method</h2>
            <ol className="list-decimal space-y-3 pl-5 text-sm font-normal leading-relaxed text-[var(--muted)]">
              {methodSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}

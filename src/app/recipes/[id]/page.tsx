import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageIcon, Sparkles } from "lucide-react";
import { createBatch, deleteRecipe } from "@/app/actions";
import { AiPhotoPill } from "@/components/recipes/ai-photo-pill";
import { HealthScoreBanner } from "@/components/recipes/health-score-banner";
import { MacroGrid } from "@/components/recipes/macro-grid";
import { Button } from "@/components/ui/button";
import { getRecipeCost } from "@/lib/log/queries";
import { getRecipeWithDetails } from "@/lib/queries";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const details = await getRecipeWithDetails(Number(id));

  if (!details) notFound();

  const { recipe, lines, perServing, healthScore } = details;
  const cost = await getRecipeCost(recipe.id);

  return (
    <div className="-mx-5 space-y-5 pb-4">
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
        <div className="absolute left-5 top-5">
          <AiPhotoPill recipeId={recipe.id} />
        </div>
      </div>

      <div className="space-y-5 px-5">
        <div>
          <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight">
            {recipe.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {recipe.servings} servings
            {cost.perServingCost != null && (
              <> · ${cost.perServingCost.toFixed(2)}/serving</>
            )}
          </p>
          {cost.perServingCost != null && cost.unpricedIngredients.length > 0 && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Based on {cost.pricedCount}/{cost.totalIngredients} priced ingredients
            </p>
          )}
        </div>

        <HealthScoreBanner result={healthScore} />
        <MacroGrid perServing={perServing} />

        <Link href={`/recipes/${recipe.id}/suggestions`}>
          <div className="flex items-center justify-between rounded-[var(--radius-lg)] bg-[#ede7f6] px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--primary)]" />
              <span className="text-sm font-semibold">Health suggestions</span>
            </div>
            <span className="text-sm text-[var(--muted)]">Local LLM →</span>
          </div>
        </Link>

        <section>
          <h2 className="mb-2 text-base font-semibold">Ingredients</h2>
          <div className="divide-y divide-[var(--border)]">
            {lines.map((line) => (
              <div key={line.id} className="flex justify-between py-3.5 text-sm">
                <span>{line.ingredient.name}</span>
                <span className="font-medium text-[var(--muted)]">
                  {line.quantity} {line.unit}
                </span>
              </div>
            ))}
          </div>
        </section>

        {recipe.instructions && (
          <section>
            <h2 className="mb-2 text-base font-semibold">Instructions</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">
              {recipe.instructions}
            </p>
          </section>
        )}

        <form action={createBatch}>
          <input type="hidden" name="recipeId" value={recipe.id} />
          <input type="hidden" name="label" value={`${recipe.name} batch`} />
          <input type="hidden" name="multiplier" value={4} />
          <Button type="submit" size="lg" className="w-full">
            Create 4× batch
          </Button>
        </form>

        <div className="flex items-center justify-between pt-1">
          <Link href="/" className="text-sm text-[var(--primary)]">
            ← Home
          </Link>
          <form action={deleteRecipe.bind(null, recipe.id)}>
            <Button type="submit" variant="ghost" size="sm">
              Delete recipe
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

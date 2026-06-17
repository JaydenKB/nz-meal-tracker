import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { HealthScoreBreakdownClient } from "@/components/recipes/health-score-breakdown-client";
import { getRecipeWithDetails } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HealthScorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const details = await getRecipeWithDetails(Number(id));
  if (!details) notFound();

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link
          href={`/recipes/${id}`}
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white"
          aria-label="Back to recipe"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-medium text-[var(--foreground)]">Health score</h1>
      </header>
      <HealthScoreBreakdownClient
        recipeId={details.recipe.id}
        recipeName={details.recipe.name}
        healthScore={details.healthScore}
      />
    </div>
  );
}

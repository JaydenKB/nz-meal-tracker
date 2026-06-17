"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RecipeConversionBanner({
  recipeId,
  inexactCount,
  firstIngredientId,
}: {
  recipeId: number;
  inexactCount: number;
  firstIngredientId?: number;
}) {
  if (inexactCount <= 0) return null;

  const fixHref = firstIngredientId
    ? `/ingredients/${firstIngredientId}#conversions`
    : `/recipes/${recipeId}`;

  return (
    <div className="rounded-[var(--radius-card)] border border-[#e8c99a] bg-[var(--orange-soft)] px-4 py-3.5">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--streak)]" strokeWidth={2} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {inexactCount} ingredient{inexactCount === 1 ? "" : "s"} can&apos;t be converted exactly
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Macros for these are estimated. Set their weights to make this recipe precise.
          </p>
        </div>
      </div>
      <Link href={fixHref} className="mt-3 block">
        <Button size="sm" variant="secondary" className="w-full">
          Set the {inexactCount} missing weight{inexactCount === 1 ? "" : "s"}
        </Button>
      </Link>
    </div>
  );
}

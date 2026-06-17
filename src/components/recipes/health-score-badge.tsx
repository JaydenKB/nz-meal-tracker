import Link from "next/link";
import { cn } from "@/lib/utils";

export function healthScoreColor(score: number): string {
  if (score >= 80) return "bg-[var(--success)]";
  if (score >= 60) return "bg-[var(--streak)]";
  return "bg-red-600";
}

export function HealthScoreBadge({
  score,
  size = "md",
  className,
}: {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass =
    size === "sm"
      ? "h-9 w-9 text-xs"
      : size === "lg"
        ? "h-14 w-14 text-xl"
        : "h-11 w-11 text-sm";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-medium text-white",
        healthScoreColor(score),
        sizeClass,
        className,
      )}
    >
      {Math.round(score)}
    </div>
  );
}

/** Tappable badge linking to the score breakdown for a saved recipe. */
export function HealthScoreBadgeLink({
  recipeId,
  score,
  size = "md",
  className,
}: {
  recipeId: number;
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <Link
      href={`/recipes/${recipeId}/score`}
      className={cn("inline-flex transition-opacity active:opacity-80", className)}
      aria-label={`Health score ${Math.round(score)} — view breakdown`}
    >
      <HealthScoreBadge score={score} size={size} />
    </Link>
  );
}

export function AiTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-md bg-[var(--ai-soft)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--ai)]",
        className,
      )}
    >
      AI
    </span>
  );
}

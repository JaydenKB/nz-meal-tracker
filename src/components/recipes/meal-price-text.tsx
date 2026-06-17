import { formatPerMealPrice, formatPerMealPriceShort } from "@/lib/cost/format";

export function MealPriceText({
  perMealCost,
  isPartial,
  variant = "default",
  className,
}: {
  perMealCost: number | null;
  isPartial?: boolean;
  variant?: "default" | "short" | "prominent";
  className?: string;
}) {
  const text =
    variant === "short"
      ? formatPerMealPriceShort(perMealCost, { partial: isPartial })
      : formatPerMealPrice(perMealCost, { partial: isPartial });

  if (!text) return null;

  if (variant === "prominent") {
    return (
      <div
        className={`rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--blue-soft)] px-4 py-3.5 ${className ?? ""}`}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-[#2d6a9f]">
          Est. meal price
        </p>
        <p className="mt-0.5 text-lg font-medium text-[#2d6a9f]">{text}</p>
        {isPartial && (
          <p className="mt-1 text-xs text-[#2d6a9f]/80">
            Based on linked store prices — some ingredients missing
          </p>
        )}
      </div>
    );
  }

  return (
    <span className={className ?? "text-[var(--muted)]"}>
      {text}
      {isPartial && variant === "default" ? " · partial" : ""}
    </span>
  );
}

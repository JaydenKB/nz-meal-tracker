/** Format estimated cost per meal for display. */
export function formatPerMealPrice(
  perMealCost: number | null | undefined,
  options?: { partial?: boolean },
): string | null {
  if (perMealCost == null || !Number.isFinite(perMealCost)) return null;
  const prefix = options?.partial ? "~" : "";
  return `${prefix}$${perMealCost.toFixed(2)} per meal`;
}

export function formatPerMealPriceShort(
  perMealCost: number | null | undefined,
  options?: { partial?: boolean },
): string | null {
  if (perMealCost == null || !Number.isFinite(perMealCost)) return null;
  const prefix = options?.partial ? "~" : "";
  return `${prefix}$${perMealCost.toFixed(2)}/meal`;
}

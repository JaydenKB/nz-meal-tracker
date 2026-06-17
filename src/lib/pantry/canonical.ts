import type { Ingredient } from "@/lib/db/schema";
import {
  convert,
  convertQuantity,
  getUnitKind,
  normalizeUnit,
  toGrams,
  toMilliliters,
  type SupportedUnit,
} from "@/lib/nutrition/units";

export type CanonicalUnit = "g" | "ml" | "each";

export type ConversionResult =
  | { ok: true; amount: number; unit: CanonicalUnit; exact: true }
  | {
      ok: false;
      reason: "unknown_density" | "unit_mismatch" | "missing_grams_per_unit" | "unsupported_unit";
    };

function inferCanonicalUnit(ingredient: Ingredient): CanonicalUnit {
  if (
    ingredient.canonicalUnit === "g" ||
    ingredient.canonicalUnit === "ml" ||
    ingredient.canonicalUnit === "each"
  ) {
    return ingredient.canonicalUnit;
  }
  const du = normalizeUnit(ingredient.defaultUnit, "g");
  if (du === "each") return "each";
  if (getUnitKind(du) === "volume") return "ml";
  return "g";
}

/** Convert any recipe/purchase amount into the ingredient's canonical pantry unit. */
export function toCanonicalAmount(
  quantity: number,
  unit: string,
  ingredient: Ingredient,
): ConversionResult {
  const canonical = inferCanonicalUnit(ingredient);
  const from = normalizeUnit(unit, normalizeUnit(ingredient.defaultUnit, "g"));

  if (from === canonical) {
    return { ok: true, amount: quantity, unit: canonical, exact: true };
  }

  const result = convert(quantity, from, canonical, {
    defaultUnit: ingredient.defaultUnit,
    canonicalUnit: ingredient.canonicalUnit,
    mlPerGram: ingredient.mlPerGram,
    gramsPerUnit: ingredient.gramsPerUnit,
    name: ingredient.name,
  });

  if (result.exact) {
    return { ok: true, amount: result.value, unit: canonical, exact: true };
  }

  if (result.reason === "missing_density") {
    return { ok: false, reason: "unknown_density" };
  }
  if (result.reason === "missing_grams_per_each") {
    return { ok: false, reason: "missing_grams_per_unit" };
  }
  return { ok: false, reason: "unsupported_unit" };
}

export function getCanonicalUnit(ingredient: Ingredient): CanonicalUnit {
  return inferCanonicalUnit(ingredient);
}

export function formatCanonicalAmount(amount: number, unit: CanonicalUnit): string {
  const rounded = amount >= 100 ? Math.round(amount) : Math.round(amount * 10) / 10;
  if (unit === "each") {
    return `${rounded} each`;
  }
  return `${rounded}${unit}`;
}

export function fromCanonicalForDisplay(
  amount: number,
  ingredient: Ingredient,
): { quantity: number; unit: string } {
  const canonical = inferCanonicalUnit(ingredient);
  const displayUnit = normalizeUnit(
    ingredient.defaultUnit,
    canonical === "each" ? "each" : canonical,
  );

  if (canonical === displayUnit || (canonical === "g" && displayUnit === "kg")) {
    if (displayUnit === "kg") {
      return { quantity: Math.round((amount / 1000) * 100) / 100, unit: "kg" };
    }
    return { quantity: Math.round(amount * 10) / 10, unit: displayUnit };
  }

  try {
    const qty = convertQuantity(amount, canonical, displayUnit);
    return { quantity: Math.round(qty * 10) / 10, unit: displayUnit };
  } catch {
    return { quantity: Math.round(amount * 10) / 10, unit: canonical };
  }
}

export function conversionFailureMessage(
  reason: NonNullable<Extract<ConversionResult, { ok: false }>["reason"]>,
): string {
  switch (reason) {
    case "unknown_density":
      return "Can't convert volume ↔ weight — set density on ingredient or buy manually";
    case "missing_grams_per_unit":
      return "Can't convert count to weight — set grams per item on ingredient";
    case "unit_mismatch":
      return "Units don't match — adjust manually";
    default:
      return "Unsupported unit — adjust manually";
  }
}

// Re-export for callers that need mass/volume helpers via pantry module
export { toGrams, toMilliliters, normalizeUnit, type SupportedUnit };

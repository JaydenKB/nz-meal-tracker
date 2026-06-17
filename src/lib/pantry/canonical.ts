import type { Ingredient } from "@/lib/db/schema";
import {
  convertQuantity,
  getUnitKind,
  normalizeUnit,
  toGrams,
  toMilliliters,
  type SupportedUnit,
} from "@/lib/nutrition/units";

export type CanonicalUnit = "g" | "ml" | "each";

export type ConversionResult =
  | { ok: true; amount: number; unit: CanonicalUnit }
  | {
      ok: false;
      reason: "unknown_density" | "unit_mismatch" | "missing_grams_per_unit" | "unsupported_unit";
    };

/** Default densities (ml per gram) for common liquids when ingredient has no ml_per_gram. */
const DEFAULT_ML_PER_GRAM: Record<string, number> = {
  water: 1,
  oil: 1.08,
  "olive oil": 1.08,
  milk: 1.03,
  honey: 0.71,
  "soy sauce": 1.1,
};

function inferCanonicalUnit(ingredient: Ingredient): CanonicalUnit {
  if (ingredient.canonicalUnit === "g" || ingredient.canonicalUnit === "ml" || ingredient.canonicalUnit === "each") {
    return ingredient.canonicalUnit;
  }
  const du = normalizeUnit(ingredient.defaultUnit, "g");
  if (du === "each") return "each";
  if (getUnitKind(du) === "volume") return "ml";
  return "g";
}

function densityForIngredient(ingredient: Ingredient): number | null {
  if (ingredient.mlPerGram != null && ingredient.mlPerGram > 0) {
    return ingredient.mlPerGram;
  }
  const name = ingredient.name.toLowerCase();
  for (const [key, val] of Object.entries(DEFAULT_ML_PER_GRAM)) {
    if (name.includes(key)) return val;
  }
  return null;
}

/** Convert any recipe/purchase amount into the ingredient's canonical pantry unit. */
export function toCanonicalAmount(
  quantity: number,
  unit: string,
  ingredient: Ingredient,
): ConversionResult {
  const canonical = inferCanonicalUnit(ingredient);
  const from = normalizeUnit(unit, normalizeUnit(ingredient.defaultUnit, "g"));
  const fromKind = getUnitKind(from);

  if (from === canonical) {
    return { ok: true, amount: quantity, unit: canonical };
  }

  if (canonical === "each") {
    if (fromKind === "each") return { ok: true, amount: quantity, unit: "each" };
    return { ok: false, reason: "unit_mismatch" };
  }

  if (canonical === "g") {
    if (fromKind === "mass") {
      try {
        const grams = toGrams(quantity, from);
        return { ok: true, amount: grams, unit: "g" };
      } catch {
        return { ok: false, reason: "unsupported_unit" };
      }
    }
    if (fromKind === "volume") {
      const ml = toMilliliters(quantity, from);
      const density = densityForIngredient(ingredient);
      if (!density) return { ok: false, reason: "unknown_density" };
      return { ok: true, amount: ml / density, unit: "g" };
    }
    if (fromKind === "each") {
      if (ingredient.gramsPerUnit != null && ingredient.gramsPerUnit > 0) {
        return { ok: true, amount: quantity * ingredient.gramsPerUnit, unit: "g" };
      }
      return { ok: false, reason: "missing_grams_per_unit" };
    }
  }

  if (canonical === "ml") {
    if (fromKind === "volume") {
      try {
        const ml = toMilliliters(quantity, from);
        return { ok: true, amount: ml, unit: "ml" };
      } catch {
        return { ok: false, reason: "unsupported_unit" };
      }
    }
    if (fromKind === "mass") {
      const density = densityForIngredient(ingredient);
      if (!density) return { ok: false, reason: "unknown_density" };
      const grams = toGrams(quantity, from);
      return { ok: true, amount: grams * density, unit: "ml" };
    }
    return { ok: false, reason: "unit_mismatch" };
  }

  return { ok: false, reason: "unit_mismatch" };
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

/** Map canonical amount back to a display unit for shopping (uses ingredient default). */
export function fromCanonicalForDisplay(
  amount: number,
  ingredient: Ingredient,
): { quantity: number; unit: string } {
  const canonical = inferCanonicalUnit(ingredient);
  const displayUnit = normalizeUnit(ingredient.defaultUnit, canonical === "each" ? "each" : canonical);

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

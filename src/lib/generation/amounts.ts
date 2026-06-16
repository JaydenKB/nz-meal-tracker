import type { Ingredient } from "@/lib/db/schema";
import { normalizeUnit, toGrams, toMilliliters } from "@/lib/nutrition/units";

type IngredientRole = "protein" | "carb" | "fat" | "vegetable" | "fruit" | "dairy" | "other";

function inferRole(ingredient: Pick<Ingredient, "name" | "proteinG" | "fatG" | "carbsG">): IngredientRole {
  const n = ingredient.name.toLowerCase();
  if (/oil|butter|margarine|lard/.test(n)) return "fat";
  if (/rice|pasta|noodle|bread|oat|quinoa|couscous|potato|kumara|sweet potato/.test(n)) {
    return "carb";
  }
  if (/broccoli|spinach|lettuce|carrot|capsicum|pepper|onion|tomato|cucumber|zucchini|cauliflower|beans|peas|corn|kale|celery|mushroom/.test(n)) {
    return "vegetable";
  }
  if (/apple|banana|berry|berries|orange|fruit/.test(n)) return "fruit";
  if (/yogurt|milk|cheese|cream|cottage/.test(n)) return "dairy";
  if (ingredient.proteinG >= 15) return "protein";
  if (ingredient.fatG >= 50) return "fat";
  if (ingredient.carbsG >= 15) return "carb";
  return "other";
}

/** Per-serving gram/ml caps by role (recipe totals = cap × servings). */
function maxTotalForRole(role: IngredientRole, servings: number): number {
  const s = Math.max(servings, 1);
  switch (role) {
    case "protein":
      return 180 * s;
    case "carb":
      return 120 * s;
    case "vegetable":
      return 200 * s;
    case "fruit":
      return 120 * s;
    case "dairy":
      return 150 * s;
    case "fat":
      return 20 * s;
    default:
      return 150 * s;
  }
}

export function amountRangeHint(
  ingredient: Pick<Ingredient, "name" | "proteinG" | "fatG" | "carbsG" | "defaultUnit">,
  servings: number,
): string {
  const role = inferRole(ingredient);
  const s = Math.max(servings, 1);
  const max = maxTotalForRole(role, s);
  const unit = ingredient.defaultUnit === "ml" ? "ml" : "g";

  const typical: Record<IngredientRole, [number, number]> = {
    protein: [60, 180],
    carb: [50, 120],
    vegetable: [80, 200],
    fruit: [50, 120],
    dairy: [50, 150],
    fat: [5, 15],
    other: [30, 120],
  };
  const [lo, hi] = typical[role];
  return `${lo * s}–${Math.min(hi * s, max)}${unit} total for ${s} serving${s === 1 ? "" : "s"}`;
}

export function clampRecipeAmount(
  amount: number,
  unit: string,
  ingredient: Pick<Ingredient, "name" | "proteinG" | "fatG" | "carbsG" | "defaultUnit">,
  servings: number,
): { amount: number; unit: string } {
  let qty = amount;
  let u = normalizeUnit(unit || ingredient.defaultUnit || "g", normalizeUnit(ingredient.defaultUnit, "g"));

  if (u === "kg") {
    qty *= 1000;
    u = "g";
  }
  if (u === "l") {
    qty *= 1000;
    u = "ml";
  }

  if (qty <= 0) {
    const role = inferRole(ingredient);
    qty = role === "fat" ? 10 : role === "protein" ? 120 : 80;
    u = ingredient.defaultUnit === "ml" ? "ml" : "g";
  }

  const role = inferRole(ingredient);
  const max = maxTotalForRole(role, servings);

  let grams: number;
  try {
    if (u === "ml" || ingredient.defaultUnit === "ml") {
      grams = toMilliliters(qty, u);
    } else if (u === "each") {
      return { amount: Math.min(qty, Math.max(servings, 1)), unit: u };
    } else {
      grams = toGrams(qty, u);
    }
  } catch {
    return { amount: qty, unit: u };
  }

  if (grams > max) {
    grams = max;
    u = ingredient.defaultUnit === "ml" ? "ml" : "g";
    qty = Math.round(grams);
  }

  return { amount: Math.round(qty * 10) / 10, unit: u };
}

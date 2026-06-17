/**
 * Built-in conversion defaults for common ingredients.
 * Used to seed the DB and for best-effort estimates (always flagged non-exact
 * until saved on the ingredient record).
 *
 * densityGPerMl = grams per millilitre (e.g. olive oil ≈ 0.91).
 */
export type ReferenceConversion = {
  /** Substring match against ingredient.name (lowercase). */
  match: string;
  canonicalUnit?: "g" | "ml" | "each";
  densityGPerMl?: number;
  gramsPerEach?: number;
};

export const CONVERSION_REFERENCE: ReferenceConversion[] = [
  { match: "olive oil", canonicalUnit: "ml", densityGPerMl: 0.91 },
  { match: "vegetable oil", canonicalUnit: "ml", densityGPerMl: 0.92 },
  { match: "canola oil", canonicalUnit: "ml", densityGPerMl: 0.92 },
  { match: "coconut oil", canonicalUnit: "ml", densityGPerMl: 0.92 },
  { match: "sesame oil", canonicalUnit: "ml", densityGPerMl: 0.92 },
  { match: "honey", canonicalUnit: "g", densityGPerMl: 1.42 },
  { match: "maple syrup", canonicalUnit: "g", densityGPerMl: 1.33 },
  { match: "water", canonicalUnit: "ml", densityGPerMl: 1.0 },
  { match: "milk", canonicalUnit: "ml", densityGPerMl: 1.03 },
  { match: "cream", canonicalUnit: "ml", densityGPerMl: 1.0 },
  { match: "soy sauce", canonicalUnit: "ml", densityGPerMl: 1.15 },
  { match: "flour", canonicalUnit: "g", densityGPerMl: 0.53 },
  { match: "plain flour", canonicalUnit: "g", densityGPerMl: 0.53 },
  { match: "all-purpose flour", canonicalUnit: "g", densityGPerMl: 0.53 },
  { match: "sugar", canonicalUnit: "g", densityGPerMl: 0.85 },
  { match: "brown sugar", canonicalUnit: "g", densityGPerMl: 0.93 },
  { match: "icing sugar", canonicalUnit: "g", densityGPerMl: 0.56 },
  { match: "rice", canonicalUnit: "g", densityGPerMl: 0.85 },
  { match: "garlic", canonicalUnit: "g", gramsPerEach: 5 },
  { match: "egg", canonicalUnit: "each", gramsPerEach: 50 },
  { match: "onion", canonicalUnit: "g", gramsPerEach: 150 },
  { match: "lemon", canonicalUnit: "g", gramsPerEach: 60 },
  { match: "lime", canonicalUnit: "g", gramsPerEach: 45 },
  { match: "avocado", canonicalUnit: "g", gramsPerEach: 150 },
  { match: "potato", canonicalUnit: "g", gramsPerEach: 170 },
  { match: "tomato", canonicalUnit: "g", gramsPerEach: 120 },
  { match: "ginger", canonicalUnit: "g", gramsPerEach: 15 },
  { match: "butter", canonicalUnit: "g", densityGPerMl: 0.96 },
];

export function lookupReferenceConversion(name: string): ReferenceConversion | null {
  const lower = name.toLowerCase();
  let best: ReferenceConversion | null = null;
  let bestLen = 0;
  for (const ref of CONVERSION_REFERENCE) {
    if (lower.includes(ref.match) && ref.match.length > bestLen) {
      best = ref;
      bestLen = ref.match.length;
    }
  }
  return best;
}

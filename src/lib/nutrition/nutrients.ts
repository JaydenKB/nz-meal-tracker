/** Extended nutrients per 100g (or per unit for each-based foods). */
export type ExtendedNutrients = {
  fiberG?: number;
  sugarG?: number;
  saturatedFatG?: number;
  sodiumMg?: number;
  omega3G?: number;
  vitaminAMcg?: number;
  vitaminCMg?: number;
  vitaminDMcg?: number;
  calciumMg?: number;
  ironMg?: number;
  potassiumMg?: number;
};

export type NutritionLookupResult = {
  name: string;
  source: "usda" | "openfoodfacts" | "reference";
  sourceId?: string;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  nutrients: ExtendedNutrients;
};

export function parseNutrientsJson(raw: string | null | undefined): ExtendedNutrients {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ExtendedNutrients;
  } catch {
    return {};
  }
}

export function serializeNutrients(n: ExtendedNutrients): string | null {
  const cleaned = Object.fromEntries(
    Object.entries(n).filter(([, v]) => v != null && v !== 0),
  );
  return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : null;
}

export function emptyNutrients(): ExtendedNutrients {
  return {};
}

export function mergeNutrients(
  base: ExtendedNutrients,
  fill: ExtendedNutrients,
): ExtendedNutrients {
  const out = { ...base };
  for (const [k, v] of Object.entries(fill) as [keyof ExtendedNutrients, number][]) {
    if (v != null && (out[k] == null || out[k] === 0)) {
      out[k] = v;
    }
  }
  return out;
}

export function mergeLookupWithScan(
  scan: {
    calories: number;
    proteinG: number;
    fatG: number;
    carbsG: number;
    nutrients?: ExtendedNutrients;
  },
  lookup: NutritionLookupResult,
): NutritionLookupResult {
  const ocrHasMacros = scan.calories > 0;
  return {
    ...lookup,
    name: scan.calories > 0 ? lookup.name : lookup.name,
    calories: ocrHasMacros ? scan.calories : lookup.calories,
    proteinG: ocrHasMacros && scan.proteinG > 0 ? scan.proteinG : lookup.proteinG,
    fatG: ocrHasMacros && scan.fatG > 0 ? scan.fatG : lookup.fatG,
    carbsG: ocrHasMacros && scan.carbsG > 0 ? scan.carbsG : lookup.carbsG,
    nutrients: mergeNutrients(scan.nutrients ?? {}, lookup.nutrients),
  };
}

export function nutrientsSummary(n: ExtendedNutrients): string {
  const parts: string[] = [];
  if (n.fiberG) parts.push(`fiber ${n.fiberG}g`);
  if (n.sodiumMg) parts.push(`sodium ${Math.round(n.sodiumMg)}mg`);
  if (n.saturatedFatG) parts.push(`sat fat ${n.saturatedFatG}g`);
  if (n.sugarG) parts.push(`sugar ${n.sugarG}g`);
  if (n.omega3G) parts.push(`omega-3 ${n.omega3G}g`);
  if (n.vitaminCMg) parts.push(`vit C ${n.vitaminCMg}mg`);
  if (n.ironMg) parts.push(`iron ${n.ironMg}mg`);
  if (n.calciumMg) parts.push(`calcium ${n.calciumMg}mg`);
  return parts.length > 0 ? parts.join(", ") : "no extended data";
}

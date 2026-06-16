import type { NutritionLookupResult } from "../nutrients";
import { lookupCommonFood } from "./common-foods";
import { buildLookupQueries, isStrongMatch } from "./normalize";
import { lookupOpenFoodFacts } from "./openfoodfacts";
import { lookupUsda } from "./usda";

function hasMacros(r: NutritionLookupResult): boolean {
  return r.calories > 0 || r.proteinG > 0 || r.carbsG > 0;
}

async function tryLookup(
  query: string,
  originalQuery: string,
): Promise<NutritionLookupResult | null> {
  const common = lookupCommonFood(query);

  try {
    const usda = await lookupUsda(query);
    if (usda && hasMacros(usda) && isStrongMatch(originalQuery, usda.name)) return usda;
  } catch {
    /* fall through */
  }

  try {
    const off = await lookupOpenFoodFacts(query);
    if (off && hasMacros(off) && isStrongMatch(originalQuery, off.name)) return off;
  } catch {
    /* fall through */
  }

  if (common) return common;

  try {
    const usda = await lookupUsda(query);
    if (usda && hasMacros(usda)) return usda;
  } catch {
    /* fall through */
  }

  try {
    const off = await lookupOpenFoodFacts(query);
    if (off && hasMacros(off)) return off;
  } catch {
    /* fall through */
  }

  return null;
}

const SOURCE_RANK: Record<NutritionLookupResult["source"], number> = {
  usda: 3,
  openfoodfacts: 2,
  reference: 1,
};

export async function lookupNutrition(query: string): Promise<NutritionLookupResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const queries = buildLookupQueries(trimmed);
  let best: NutritionLookupResult | null = null;

  for (const q of queries) {
    const result = await tryLookup(q, trimmed);
    if (!result) continue;

    if (!best || SOURCE_RANK[result.source] > SOURCE_RANK[best.source]) {
      best = result;
    }

    if (result.source === "usda" || result.source === "openfoodfacts") {
      return result;
    }
  }

  return best ?? lookupCommonFood(trimmed);
}

export async function enrichFromPublicDatabase(input: {
  name: string;
  calories?: number;
  proteinG?: number;
  fatG?: number;
  carbsG?: number;
}): Promise<NutritionLookupResult | null> {
  const lookup = await lookupNutrition(input.name);
  if (!lookup) return null;

  const ocrHasMacros = (input.calories ?? 0) > 0;

  return {
    ...lookup,
    calories: ocrHasMacros ? (input.calories ?? lookup.calories) : lookup.calories,
    proteinG:
      ocrHasMacros && (input.proteinG ?? 0) > 0
        ? (input.proteinG ?? lookup.proteinG)
        : lookup.proteinG,
    fatG:
      ocrHasMacros && (input.fatG ?? 0) > 0 ? (input.fatG ?? lookup.fatG) : lookup.fatG,
    carbsG:
      ocrHasMacros && (input.carbsG ?? 0) > 0
        ? (input.carbsG ?? lookup.carbsG)
        : lookup.carbsG,
  };
}

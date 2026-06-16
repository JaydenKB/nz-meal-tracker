import type { ExtendedNutrients, NutritionLookupResult } from "../nutrients";
import { scoreNameMatch } from "./normalize";

/** USDA FoodData Central nutrient IDs */
const USDA = {
  ENERGY_KCAL: 1008,
  PROTEIN: 1003,
  FAT: 1004,
  CARBS: 1005,
  FIBER: 1079,
  SUGARS: 2000,
  SAT_FAT: 1258,
  SODIUM: 1093,
  VITAMIN_A: 1106,
  VITAMIN_C: 1162,
  VITAMIN_D: 1114,
  CALCIUM: 1087,
  IRON: 1089,
  POTASSIUM: 1092,
  EPA: 1278,
  DHA: 1272,
  ALA: 1404,
} as const;

type UsdaNutrient = { nutrientId?: number; value?: number };

function pickNutrient(list: UsdaNutrient[] | undefined, id: number): number {
  if (!list) return 0;
  const row = list.find((n) => n.nutrientId === id);
  return row?.value ?? 0;
}

function mapUsdaNutrients(list: UsdaNutrient[] | undefined): ExtendedNutrients {
  const epa = pickNutrient(list, USDA.EPA);
  const dha = pickNutrient(list, USDA.DHA);
  const ala = pickNutrient(list, USDA.ALA);
  const omega3 = epa + dha + ala;

  return {
    fiberG: round1(pickNutrient(list, USDA.FIBER)),
    sugarG: round1(pickNutrient(list, USDA.SUGARS)),
    saturatedFatG: round1(pickNutrient(list, USDA.SAT_FAT)),
    sodiumMg: round1(pickNutrient(list, USDA.SODIUM)),
    omega3G: omega3 > 0 ? round2(omega3) : undefined,
    vitaminAMcg: round1(pickNutrient(list, USDA.VITAMIN_A)),
    vitaminCMg: round1(pickNutrient(list, USDA.VITAMIN_C)),
    vitaminDMcg: round1(pickNutrient(list, USDA.VITAMIN_D)),
    calciumMg: round1(pickNutrient(list, USDA.CALCIUM)),
    ironMg: round1(pickNutrient(list, USDA.IRON)),
    potassiumMg: round1(pickNutrient(list, USDA.POTASSIUM)),
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function apiKey() {
  return process.env.USDA_API_KEY ?? "DEMO_KEY";
}

const BAD_FOOD = /\b(babyfood|baby food|snack|chips|candy|formula|juice drink|restaurant|fast food)\b/i;

async function fetchUsdaSearch(query: string): Promise<{ fdcId?: number; description?: string; foodNutrients?: UsdaNutrient[] }[]> {
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "10");
  url.searchParams.set("dataType", "Foundation,SR Legacy,Survey (FNDDS)");

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
    if (res.status === 429 && attempt === 0) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    if (!res.ok) return [];
    const data = (await res.json()) as { foods?: { fdcId?: number; description?: string; foodNutrients?: UsdaNutrient[] }[] };
    return data.foods ?? [];
  }
  return [];
}

async function fetchUsdaFoodDetail(fdcId: number): Promise<UsdaNutrient[] | null> {
  const url = new URL(`https://api.nal.usda.gov/fdc/v1/food/${fdcId}`);
  url.searchParams.set("api_key", apiKey());

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    foodNutrients?: { nutrient?: { id?: number }; amount?: number }[];
  };

  return (data.foodNutrients ?? []).map((n) => ({
    nutrientId: n.nutrient?.id,
    value: n.amount,
  }));
}

export async function lookupUsda(query: string): Promise<NutritionLookupResult | null> {
  const foods = await fetchUsdaSearch(query);
  if (foods.length === 0) return null;

  const ranked = foods
    .map((food) => ({
      food,
      score:
        scoreNameMatch(query, food.description ?? "") +
        (food.description?.toLowerCase().includes("raw") ? 10 : 0) -
        (BAD_FOOD.test(food.description ?? "") ? 30 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  for (const { food } of ranked) {
    let nutrients = food.foodNutrients;
    let calories = pickNutrient(nutrients, USDA.ENERGY_KCAL);

    if ((!calories || !nutrients?.length) && food.fdcId) {
      const detail = await fetchUsdaFoodDetail(food.fdcId);
      if (detail?.length) {
        nutrients = detail;
        calories = pickNutrient(nutrients, USDA.ENERGY_KCAL);
      }
    }

    const mapped = mapUsdaFood({ ...food, foodNutrients: nutrients }, query);
    if (mapped) return mapped;
  }

  return null;
}

function mapUsdaFood(
  food: { fdcId?: number; description?: string; foodNutrients?: UsdaNutrient[] },
  query: string,
): NutritionLookupResult | null {
  if (!food.foodNutrients?.length) return null;

  const proteinG = round1(pickNutrient(food.foodNutrients, USDA.PROTEIN));
  const fatG = round1(pickNutrient(food.foodNutrients, USDA.FAT));
  const carbsG = round1(pickNutrient(food.foodNutrients, USDA.CARBS));

  let calories = pickNutrient(food.foodNutrients, USDA.ENERGY_KCAL);
  if (!calories) {
    calories =
      pickNutrient(food.foodNutrients, 1062) || pickNutrient(food.foodNutrients, 2047);
  }
  if (!calories && (proteinG || fatG || carbsG)) {
    calories = Math.round(proteinG * 4 + fatG * 9 + carbsG * 4);
  }

  if (calories <= 0 && proteinG <= 0 && carbsG <= 0) return null;

  return {
    name: food.description ?? query,
    source: "usda",
    sourceId: String(food.fdcId ?? ""),
    calories: Math.round(calories),
    proteinG,
    fatG,
    carbsG,
    nutrients: mapUsdaNutrients(food.foodNutrients),
  };
}

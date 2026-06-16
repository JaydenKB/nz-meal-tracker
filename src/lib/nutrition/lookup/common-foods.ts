/** Curated per-100g reference values (USDA-aligned). Used when APIs miss or rate-limit. */
import type { ExtendedNutrients, NutritionLookupResult } from "../nutrients";

type CommonEntry = Omit<NutritionLookupResult, "source" | "sourceId"> & {
  aliases: string[];
};

const ENTRIES: CommonEntry[] = [
  {
    name: "Banana, raw",
    aliases: ["banana", "bananas", "cavendish banana"],
    calories: 89,
    proteinG: 1.1,
    fatG: 0.3,
    carbsG: 22.8,
    nutrients: { fiberG: 2.6, sugarG: 12.2, potassiumMg: 358, vitaminCMg: 8.7 },
  },
  {
    name: "Apple, raw",
    aliases: ["apple", "apples"],
    calories: 52,
    proteinG: 0.3,
    fatG: 0.2,
    carbsG: 13.8,
    nutrients: { fiberG: 2.4, sugarG: 10.4, vitaminCMg: 4.6 },
  },
  {
    name: "Orange, raw",
    aliases: ["orange", "oranges"],
    calories: 47,
    proteinG: 0.9,
    fatG: 0.1,
    carbsG: 11.8,
    nutrients: { fiberG: 2.4, sugarG: 9.4, vitaminCMg: 53.2 },
  },
  {
    name: "Avocado, raw",
    aliases: ["avocado", "avocados"],
    calories: 160,
    proteinG: 2,
    fatG: 14.7,
    carbsG: 8.5,
    nutrients: { fiberG: 6.7, potassiumMg: 485 },
  },
  {
    name: "Broccoli, raw",
    aliases: ["broccoli"],
    calories: 34,
    proteinG: 2.8,
    fatG: 0.4,
    carbsG: 6.6,
    nutrients: { fiberG: 2.6, vitaminCMg: 89.2, calciumMg: 47 },
  },
  {
    name: "Spinach, raw",
    aliases: ["spinach", "baby spinach"],
    calories: 23,
    proteinG: 2.9,
    fatG: 0.4,
    carbsG: 3.6,
    nutrients: { fiberG: 2.2, ironMg: 2.7, vitaminCMg: 28.1 },
  },
  {
    name: "Chicken breast, raw",
    aliases: ["chicken breast", "chicken breasts", "skinless chicken breast"],
    calories: 120,
    proteinG: 22.5,
    fatG: 2.6,
    carbsG: 0,
    nutrients: { sodiumMg: 45, potassiumMg: 334 },
  },
  {
    name: "Brown rice, cooked",
    aliases: ["brown rice", "rice brown", "cooked brown rice"],
    calories: 123,
    proteinG: 2.7,
    fatG: 1,
    carbsG: 25.6,
    nutrients: { fiberG: 1.6 },
  },
  {
    name: "White rice, cooked",
    aliases: ["white rice", "rice", "jasmine rice", "basmati rice", "cooked rice"],
    calories: 130,
    proteinG: 2.4,
    fatG: 0.3,
    carbsG: 28.2,
    nutrients: {},
  },
  {
    name: "Egg, whole raw",
    aliases: ["egg", "eggs", "free range eggs", "free range egg"],
    calories: 143,
    proteinG: 12.6,
    fatG: 9.5,
    carbsG: 0.7,
    nutrients: { ironMg: 1.8, vitaminDMcg: 2.2 },
  },
  {
    name: "Oats, dry",
    aliases: ["oats", "rolled oats", "porridge oats"],
    calories: 379,
    proteinG: 13.2,
    fatG: 6.5,
    carbsG: 67.7,
    nutrients: { fiberG: 10.1, ironMg: 4.3 },
  },
  {
    name: "Potato, raw",
    aliases: ["potato", "potatoes", "russet potato"],
    calories: 77,
    proteinG: 2,
    fatG: 0.1,
    carbsG: 17.5,
    nutrients: { fiberG: 2.2, potassiumMg: 425, vitaminCMg: 19.7 },
  },
  {
    name: "Tomato, raw",
    aliases: ["tomato", "tomatoes"],
    calories: 18,
    proteinG: 0.9,
    fatG: 0.2,
    carbsG: 3.9,
    nutrients: { fiberG: 1.2, vitaminCMg: 13.7, potassiumMg: 237 },
  },
  {
    name: "Salmon, raw",
    aliases: ["salmon", "salmon fillet", "atlantic salmon"],
    calories: 208,
    proteinG: 20.4,
    fatG: 13.4,
    carbsG: 0,
    nutrients: { omega3G: 2.3, sodiumMg: 59, potassiumMg: 363 },
  },
  {
    name: "Beef mince, raw",
    aliases: ["beef mince", "mince", "ground beef", "lean beef mince"],
    calories: 209,
    proteinG: 20,
    fatG: 14,
    carbsG: 0,
    nutrients: { ironMg: 2.4, saturatedFatG: 5.5 },
  },
  {
    name: "Milk, whole",
    aliases: ["milk", "whole milk", "full cream milk"],
    calories: 61,
    proteinG: 3.2,
    fatG: 3.3,
    carbsG: 4.8,
    nutrients: { calciumMg: 113, vitaminDMcg: 1.2 },
  },
  {
    name: "Greek yoghurt, plain",
    aliases: ["greek yoghurt", "greek yogurt", "yoghurt", "yogurt", "plain yoghurt"],
    calories: 97,
    proteinG: 9,
    fatG: 5,
    carbsG: 3.6,
    nutrients: { calciumMg: 110 },
  },
  {
    name: "Bread, whole wheat",
    aliases: ["bread", "wholemeal bread", "whole wheat bread", "toast"],
    calories: 247,
    proteinG: 13,
    fatG: 3.4,
    carbsG: 41,
    nutrients: { fiberG: 7.4, sodiumMg: 430 },
  },
  {
    name: "Pasta, cooked",
    aliases: ["pasta", "spaghetti", "penne", "cooked pasta"],
    calories: 131,
    proteinG: 5,
    fatG: 1.1,
    carbsG: 25,
    nutrients: { fiberG: 1.8, ironMg: 1.3 },
  },
  {
    name: "Quinoa, cooked",
    aliases: ["quinoa", "cooked quinoa"],
    calories: 120,
    proteinG: 4.4,
    fatG: 1.9,
    carbsG: 21.3,
    nutrients: { fiberG: 2.8, ironMg: 1.5 },
  },
  {
    name: "Sweet potato, raw",
    aliases: ["sweet potato", "sweet potatoes", "kumara"],
    calories: 86,
    proteinG: 1.6,
    fatG: 0.1,
    carbsG: 20.1,
    nutrients: { fiberG: 3, vitaminCMg: 2.4, potassiumMg: 337 },
  },
  {
    name: "Cheddar cheese",
    aliases: ["cheddar", "cheese", "tasty cheese"],
    calories: 403,
    proteinG: 24.9,
    fatG: 33.1,
    carbsG: 1.3,
    nutrients: { calciumMg: 721, saturatedFatG: 21.1, sodiumMg: 621 },
  },
  {
    name: "Olive oil",
    aliases: ["olive oil", "extra virgin olive oil"],
    calories: 884,
    proteinG: 0,
    fatG: 100,
    carbsG: 0,
    nutrients: { saturatedFatG: 14.4 },
  },
  {
    name: "Butter",
    aliases: ["butter", "salted butter"],
    calories: 717,
    proteinG: 0.9,
    fatG: 81.1,
    carbsG: 0.1,
    nutrients: { saturatedFatG: 51.4, vitaminDMcg: 1.5 },
  },
];

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

export function lookupCommonFood(query: string): NutritionLookupResult | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  const qTokens = tokenize(q);

  let best: { entry: CommonEntry; score: number } | null = null;

  for (const entry of ENTRIES) {
    for (const alias of entry.aliases) {
      const a = alias.toLowerCase();
      let score = 0;

      if (q === a || q.includes(a) || a.includes(q)) score = 100;
      else {
        const aTokens = tokenize(a);
        const overlap = aTokens.filter((t) => qTokens.includes(t)).length;
        if (overlap > 0) score = overlap * 20;
      }

      if (score > 0 && (!best || score > best.score)) {
        best = { entry, score };
      }
    }
  }

  if (!best || best.score < 20) return null;

  const { entry } = best;
  return {
    name: entry.name,
    source: "reference",
    sourceId: entry.name,
    calories: entry.calories,
    proteinG: entry.proteinG,
    fatG: entry.fatG,
    carbsG: entry.carbsG,
    nutrients: entry.nutrients ?? {},
  };
}

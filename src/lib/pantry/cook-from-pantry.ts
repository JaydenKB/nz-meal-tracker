import { db } from "@/lib/db";
import { recipes, recipeIngredients, ingredients, storeProducts, stores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPantryMap } from "@/lib/pantry/queries";
import {
  buildRecipePantryMatch,
  buildShortfallShoppingLines,
  type RecipeCookability,
  type RecipePantryMatch,
} from "@/lib/pantry/recipe-match";
import { getAllRecipesWithSummary, getRecipeWithDetails } from "@/lib/queries";
import { buildShoppingListCore } from "@/lib/shopping/buildList";

export type CookFromPantryFilter = "all" | "high_protein" | "quick";

export type CookFromPantryResult = {
  cookNow: RecipePantryMatch[];
  almost: RecipePantryMatch[];
  notYet: RecipePantryMatch[];
  cookNowCount: number;
  inStockIngredientIds: number[];
};

function applyFilter(items: RecipePantryMatch[], filter: CookFromPantryFilter): RecipePantryMatch[] {
  if (filter === "high_protein") {
    return items.filter((r) => r.proteinG >= 25);
  }
  if (filter === "quick") {
    return items.filter((r) => r.kcal <= 450);
  }
  return items;
}

function sortCookNow(a: RecipePantryMatch, b: RecipePantryMatch): number {
  return b.score - a.score || b.proteinG - a.proteinG;
}

function sortAlmost(a: RecipePantryMatch, b: RecipePantryMatch): number {
  if (a.gapCount !== b.gapCount) return a.gapCount - b.gapCount;
  const costA = a.perMealCost ?? 999;
  const costB = b.perMealCost ?? 999;
  return costA - costB;
}

export async function getCookFromPantryMatches(
  filter: CookFromPantryFilter = "all",
): Promise<CookFromPantryResult> {
  const [summaries, pantryMap] = await Promise.all([
    getAllRecipesWithSummary(),
    getPantryMap(),
  ]);

  const matches: RecipePantryMatch[] = [];

  for (const summary of summaries) {
    const details = await getRecipeWithDetails(summary.recipe.id);
    if (!details) continue;

    const lines = details.lines.map((l) => ({
      quantity: l.quantity,
      unit: l.unit,
      ingredient: l.ingredient,
    }));

    matches.push(
      buildRecipePantryMatch({
        recipeId: summary.recipe.id,
        recipeName: summary.recipe.name,
        servings: summary.recipe.servings,
        kcal: summary.kcal,
        proteinG: summary.proteinG,
        score: summary.score,
        perMealCost: summary.perMealCost,
        imageUrl: summary.recipe.imageUrl,
        lines,
        pantryMap,
      }),
    );
  }

  const filtered = applyFilter(matches, filter);
  const cookNow = filtered.filter((m) => m.cookability === "cook_now").sort(sortCookNow);
  const almost = filtered.filter((m) => m.cookability === "almost").sort(sortAlmost);
  const notYet = filtered.filter((m) => m.cookability === "not_yet").sort(sortAlmost);

  const inStockIngredientIds = [...pantryMap.values()]
    .filter((p) => p.quantity > 0)
    .map((p) => p.ingredientId);

  return {
    cookNow,
    almost,
    notYet,
    cookNowCount: cookNow.length,
    inStockIngredientIds,
  };
}

export async function getRecipePantryMatch(recipeId: number): Promise<RecipePantryMatch | null> {
  const [details, pantryMap, summary] = await Promise.all([
    getRecipeWithDetails(recipeId),
    getPantryMap(),
    getAllRecipesWithSummary().then((all) => all.find((r) => r.recipe.id === recipeId)),
  ]);

  if (!details) return null;

  const lines = details.lines.map((l) => ({
    quantity: l.quantity,
    unit: l.unit,
    ingredient: l.ingredient,
  }));

  return buildRecipePantryMatch({
    recipeId: details.recipe.id,
    recipeName: details.recipe.name,
    servings: details.recipe.servings,
    kcal: summary?.kcal ?? Math.round(details.perServing.calories),
    proteinG: summary?.proteinG ?? details.perServing.proteinG,
    score: details.healthScore.score,
    perMealCost: summary?.perMealCost ?? null,
    imageUrl: details.recipe.imageUrl,
    lines,
    pantryMap,
  });
}

export async function getRecipeShortfallShoppingList(recipeId: number) {
  const [match, details] = await Promise.all([
    getRecipePantryMatch(recipeId),
    getRecipeWithDetails(recipeId),
  ]);

  if (!match || !details) return null;

  const originalLines = details.lines.map((l) => ({
    quantity: l.quantity,
    unit: l.unit,
    ingredient: l.ingredient,
  }));

  const shortfallLines = buildShortfallShoppingLines(originalLines, match);

  const products = await db
    .select()
    .from(storeProducts)
    .innerJoin(stores, eq(storeProducts.storeId, stores.id))
    .innerJoin(ingredients, eq(storeProducts.ingredientId, ingredients.id));

  const groups = buildShoppingListCore(
    shortfallLines,
    products.map((p) => ({
      ...p.store_products,
      store: p.stores,
      ingredient: p.ingredients,
    })),
  );

  return { match, groups, shortfallLines };
}

export type { RecipeCookability, RecipePantryMatch };

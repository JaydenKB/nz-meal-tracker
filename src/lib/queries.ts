import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  batches,
  ingredients,
  recipeIngredients,
  recipes,
  storeProducts,
  stores,
} from "@/lib/db/schema";
import {
  calculateLineMacros,
  calculateLineNutrients,
  perServing,
  perServingNutrients,
  roundMacros,
  sumMacros,
  sumNutrients,
} from "@/lib/nutrition/calculate";
import { calculateHealthScore } from "@/lib/nutrition/healthScore";
import type { ExtendedNutrients } from "@/lib/nutrition/nutrients";
import { buildShoppingListWithPantry } from "@/lib/shopping/buildList";
import { buildShoppingCostSummary } from "@/lib/cost/estimate";
import { getPantryMap } from "@/lib/pantry/queries";
import { getRecipeCost } from "@/lib/cost/recipe";

export async function getAllRecipesWithSummary() {
  const all = await db.select().from(recipes).orderBy(desc(recipes.createdAt));
  return Promise.all(
    all.map(async (recipe) => {
      const details = await getRecipeWithDetails(recipe.id);
      const cost = await getRecipeCost(recipe.id);
      return {
        recipe,
        kcal: details?.perServing.calories ?? 0,
        proteinG: details?.perServing.proteinG ?? 0,
        score: details?.healthScore.score ?? 0,
        perMealCost: cost.perMealCost,
        costPartial: cost.isPartial,
      };
    }),
  );
}

export async function getLatestBatch() {
  return db.select().from(batches).orderBy(desc(batches.createdAt)).limit(1).get();
}

export async function getRecentRecipesWithSummary(limit = 10) {
  const recent = await db.select().from(recipes).orderBy(desc(recipes.createdAt)).limit(limit);

  return Promise.all(
    recent.map(async (recipe) => {
      const details = await getRecipeWithDetails(recipe.id);
      const cost = await getRecipeCost(recipe.id);
      return {
        recipe,
        kcal: details?.perServing.calories ?? 0,
        score: details?.healthScore.score ?? 0,
        perMealCost: cost.perMealCost,
        costPartial: cost.isPartial,
      };
    }),
  );
}

export async function getRecentRecipes(limit = 10) {
  return db.select().from(recipes).orderBy(desc(recipes.createdAt)).limit(limit);
}

export async function getAllIngredients() {
  return db.select().from(ingredients).orderBy(ingredients.name);
}

export async function getAllStores() {
  return db.select().from(stores).orderBy(stores.name);
}

export async function getStoreProducts() {
  return db
    .select()
    .from(storeProducts)
    .innerJoin(stores, eq(storeProducts.storeId, stores.id))
    .innerJoin(ingredients, eq(storeProducts.ingredientId, ingredients.id))
    .orderBy(stores.name);
}

export async function getRecipeWithDetails(id: number) {
  const recipe = await db.select().from(recipes).where(eq(recipes.id, id)).get();
  if (!recipe) return null;

  const lines = await db
    .select()
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .where(eq(recipeIngredients.recipeId, id));

  const lineMacros = lines.map((line) =>
    calculateLineMacros({
      quantity: line.recipe_ingredients.quantity,
      unit: line.recipe_ingredients.unit,
      ingredient: line.ingredients,
    }),
  );

  const lineNutrients = lines.map((line) =>
    calculateLineNutrients({
      quantity: line.recipe_ingredients.quantity,
      unit: line.recipe_ingredients.unit,
      ingredient: line.ingredients,
    }),
  );

  const total = roundMacros(sumMacros(lineMacros));
  const perServingMacros = roundMacros(perServing(total, recipe.servings));
  const totalNutrients = sumNutrients(lineNutrients);
  const perServingExtended = perServingNutrients(totalNutrients, recipe.servings);

  const processedCount = lines.filter((l) => l.ingredients.isProcessed).length;
  const healthScore = calculateHealthScore(
    perServingMacros,
    processedCount,
    lines.length,
    perServingExtended,
  );

  return {
    recipe,
    lines: lines.map((l) => ({
      id: l.recipe_ingredients.id,
      quantity: l.recipe_ingredients.quantity,
      unit: l.recipe_ingredients.unit,
      ingredient: l.ingredients,
    })),
    total,
    perServing: perServingMacros,
    perServingNutrients: perServingExtended,
    healthScore,
  };
}

export async function getBatchWithShoppingList(id: number) {
  const batch = await db.select().from(batches).where(eq(batches.id, id)).get();
  if (!batch) return null;

  const details = await getRecipeWithDetails(batch.recipeId);
  if (!details) return null;

  const products = await db
    .select()
    .from(storeProducts)
    .innerJoin(stores, eq(storeProducts.storeId, stores.id))
    .innerJoin(ingredients, eq(storeProducts.ingredientId, ingredients.id));

  const productRows = products.map((p) => ({
    ...p.store_products,
    store: p.stores,
    ingredient: p.ingredients,
  }));

  const pantryMap = await getPantryMap();

  const pantryList = buildShoppingListWithPantry(
    details.lines.map((l) => ({
      quantity: l.quantity,
      unit: l.unit,
      ingredient: l.ingredient,
    })),
    productRows,
    batch.multiplier,
    pantryMap,
  );

  const shoppingList = pantryList.groups;

  let estimatedTotal = 0;
  let hasPrices = false;

  for (const group of shoppingList) {
    if (!group.store) continue;
    for (const item of group.items) {
      const product = productRows.find(
        (p) =>
          p.ingredientId === item.ingredientId &&
          p.productName === item.productName &&
          p.storeId === group.store!.id,
      );
      if (product?.priceNzd && item.packages > 0) {
        estimatedTotal += product.priceNzd * item.packages;
        hasPrices = true;
      }
    }
  }

  const costSummary = buildShoppingCostSummary(
    shoppingList,
    productRows.map((p) => ({
      ingredientId: p.ingredientId,
      productName: p.productName,
      storeId: p.storeId,
      priceNzd: p.priceNzd,
    })),
  );

  return {
    batch,
    recipe: details.recipe,
    shoppingList,
    pantryOwned: pantryList.owned,
    pantrySkippedCount: pantryList.skippedCount,
    pantryCantAutoDeduct: pantryList.cantAutoDeduct,
    estimatedTotal: hasPrices ? Math.round(estimatedTotal * 100) / 100 : null,
    costSummary,
  };
}

export async function getRecipeCount() {
  const result = await db.select().from(recipes);
  return result.length;
}

export async function getIngredientCount() {
  const result = await db.select().from(ingredients);
  return result.length;
}

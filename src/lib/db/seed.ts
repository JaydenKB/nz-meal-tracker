import { count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  ingredients,
  recipeIngredients,
  recipes,
  storeProducts,
  stores,
} from "@/lib/db/schema";

const DEFAULT_STORES = [
  { name: "Woolworths Mt Eden", notes: "Supermarket" },
  { name: "New World Victoria Park", notes: "Supermarket" },
  { name: "Pak'nSave Albany", notes: "Supermarket" },
  { name: "Farro Grey Lynn", notes: "Specialty grocer" },
  { name: "New Market Farmers Market", notes: "Farmers market — produce & fresh goods" },
];

const SEED_INGREDIENTS = [
  { name: "Chicken breast", defaultUnit: "g", calories: 165, proteinG: 31, fatG: 3.6, carbsG: 0, isProcessed: false },
  { name: "Brown rice", defaultUnit: "g", calories: 111, proteinG: 2.6, fatG: 0.9, carbsG: 23, isProcessed: false },
  { name: "Broccoli", defaultUnit: "g", calories: 34, proteinG: 2.8, fatG: 0.4, carbsG: 7, isProcessed: false },
  { name: "Olive oil", defaultUnit: "ml", calories: 884, proteinG: 0, fatG: 100, carbsG: 0, isProcessed: false },
  { name: "Greek yogurt", defaultUnit: "g", calories: 97, proteinG: 9, fatG: 5, carbsG: 3.6, isProcessed: false },
  { name: "Oats", defaultUnit: "g", calories: 389, proteinG: 17, fatG: 7, carbsG: 66, isProcessed: false },
  { name: "Blueberries", defaultUnit: "g", calories: 57, proteinG: 0.7, fatG: 0.3, carbsG: 14, isProcessed: false },
  { name: "Salmon fillet", defaultUnit: "g", calories: 208, proteinG: 20, fatG: 13, carbsG: 0, isProcessed: false },
  { name: "Sweet potato", defaultUnit: "g", calories: 86, proteinG: 1.6, fatG: 0.1, carbsG: 20, isProcessed: false },
  { name: "Spinach", defaultUnit: "g", calories: 23, proteinG: 2.9, fatG: 0.4, carbsG: 3.6, isProcessed: false },
];

export async function seedDatabase() {
  const [storeCount] = await db.select({ value: count() }).from(stores);
  if (storeCount.value === 0) {
    await db.insert(stores).values(DEFAULT_STORES);
  }

  const [ingredientCount] = await db.select({ value: count() }).from(ingredients);
  if (ingredientCount.value === 0) {
    await db.insert(ingredients).values(SEED_INGREDIENTS);
  }

  const [productCount] = await db.select({ value: count() }).from(storeProducts);
  if (productCount.value === 0) {
    const allStores = await db.select().from(stores);
    const allIngredients = await db.select().from(ingredients);
    const storeByName = Object.fromEntries(allStores.map((s) => [s.name, s]));
    const ingByName = Object.fromEntries(allIngredients.map((i) => [i.name, i]));

    const links = [
      { store: "Woolworths Mt Eden", ingredient: "Chicken breast", productName: "Free Range Chicken Breast 500g", packageSize: 500, packageUnit: "g", priceNzd: 12.5 },
      { store: "Woolworths Mt Eden", ingredient: "Brown rice", productName: "SunRice Brown Rice 1kg", packageSize: 1000, packageUnit: "g", priceNzd: 4.5 },
      { store: "New Market Farmers Market", ingredient: "Broccoli", productName: "Fresh broccoli head", packageSize: 1, packageUnit: "each", priceNzd: 3, notes: "~300g per head" },
      { store: "Farro Grey Lynn", ingredient: "Olive oil", productName: "Extra Virgin Olive Oil 500ml", packageSize: 500, packageUnit: "ml", priceNzd: 14 },
      { store: "New World Victoria Park", ingredient: "Greek yogurt", productName: "Anchor Protein Yogurt 700g", packageSize: 700, packageUnit: "g", priceNzd: 7.5 },
      { store: "Pak'nSave Albany", ingredient: "Oats", productName: "Harraways Rolled Oats 900g", packageSize: 900, packageUnit: "g", priceNzd: 5.5 },
      { store: "Woolworths Mt Eden", ingredient: "Blueberries", productName: "Fresh blueberries 125g punnet", packageSize: 125, packageUnit: "g", priceNzd: 5 },
    ];

    for (const link of links) {
      const store = storeByName[link.store];
      const ingredient = ingByName[link.ingredient];
      if (!store || !ingredient) continue;
      await db.insert(storeProducts).values({
        storeId: store.id,
        ingredientId: ingredient.id,
        productName: link.productName,
        packageSize: link.packageSize,
        packageUnit: link.packageUnit,
        priceNzd: link.priceNzd,
        isPreferred: true,
        notes: link.notes ?? null,
      });
    }
  }

  const [recipeCount] = await db.select({ value: count() }).from(recipes);
  if (recipeCount.value > 0) return { seeded: false, message: "Database already has recipes" };

  const allIngredients = await db.select().from(ingredients);
  const byName = Object.fromEntries(allIngredients.map((i) => [i.name, i]));

  const [chickenBowl] = await db
    .insert(recipes)
    .values({
      name: "Chicken & Broccoli Rice Bowl",
      servings: 2,
      instructions:
        "Cook brown rice. Pan-sear chicken breast with olive oil. Steam broccoli and assemble bowls.",
    })
    .returning();

  const chickenBowlLines = [
    { ingredient: byName["Chicken breast"], quantity: 300, unit: "g" },
    { ingredient: byName["Brown rice"], quantity: 150, unit: "g" },
    { ingredient: byName["Broccoli"], quantity: 200, unit: "g" },
    { ingredient: byName["Olive oil"], quantity: 1, unit: "tbsp" },
  ];

  for (const line of chickenBowlLines) {
    if (!line.ingredient) continue;
    await db.insert(recipeIngredients).values({
      recipeId: chickenBowl.id,
      ingredientId: line.ingredient.id,
      quantity: line.quantity,
      unit: line.unit,
    });
  }

  const [yogurtBowl] = await db
    .insert(recipes)
    .values({
      name: "Protein Yogurt & Oats Bowl",
      servings: 1,
      instructions: "Mix oats with Greek yogurt. Top with blueberries.",
    })
    .returning();

  const yogurtLines = [
    { ingredient: byName["Greek yogurt"], quantity: 200, unit: "g" },
    { ingredient: byName["Oats"], quantity: 50, unit: "g" },
    { ingredient: byName["Blueberries"], quantity: 80, unit: "g" },
  ];

  for (const line of yogurtLines) {
    if (!line.ingredient) continue;
    await db.insert(recipeIngredients).values({
      recipeId: yogurtBowl.id,
      ingredientId: line.ingredient.id,
      quantity: line.quantity,
      unit: line.unit,
    });
  }

  return { seeded: true, message: "Seeded stores, ingredients, and 2 sample recipes" };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  batches,
  ingredients,
  recipeIngredients,
  recipes,
  storeProducts,
  stores,
} from "@/lib/db/schema";

export async function createIngredient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await db.insert(ingredients).values({
    name,
    defaultUnit: String(formData.get("defaultUnit") ?? "g"),
    calories: Number(formData.get("calories") ?? 0),
    proteinG: Number(formData.get("proteinG") ?? 0),
    fatG: Number(formData.get("fatG") ?? 0),
    carbsG: Number(formData.get("carbsG") ?? 0),
    isProcessed: formData.get("isProcessed") === "on",
  });

  revalidatePath("/ingredients");
}

export async function deleteIngredient(id: number) {
  await db.delete(ingredients).where(eq(ingredients.id, id));
  revalidatePath("/ingredients");
}

export async function createStore(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await db.insert(stores).values({
    name,
    notes: String(formData.get("notes") ?? "") || null,
  });

  revalidatePath("/stores");
}

export async function deleteStore(id: number) {
  await db.delete(stores).where(eq(stores.id, id));
  revalidatePath("/stores");
}

export async function createStoreProduct(formData: FormData) {
  await db.insert(storeProducts).values({
    storeId: Number(formData.get("storeId")),
    ingredientId: Number(formData.get("ingredientId")),
    productName: String(formData.get("productName") ?? "").trim(),
    packageSize: Number(formData.get("packageSize") ?? 1),
    packageUnit: String(formData.get("packageUnit") ?? "g"),
    priceNzd: formData.get("priceNzd") ? Number(formData.get("priceNzd")) : null,
    isPreferred: formData.get("isPreferred") === "on",
    notes: String(formData.get("notes") ?? "") || null,
  });

  revalidatePath("/stores");
}

export async function deleteStoreProduct(id: number) {
  await db.delete(storeProducts).where(eq(storeProducts.id, id));
  revalidatePath("/stores");
}

export async function createRecipe(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const servings = Math.max(1, Number(formData.get("servings") ?? 1));
  const instructions = String(formData.get("instructions") ?? "") || null;

  const [recipe] = await db
    .insert(recipes)
    .values({ name, servings, instructions })
    .returning({ id: recipes.id });

  const ingredientIds = formData.getAll("ingredientId").map(Number);
  const quantities = formData.getAll("quantity").map(Number);
  const units = formData.getAll("unit").map(String);

  for (let i = 0; i < ingredientIds.length; i++) {
    if (!ingredientIds[i] || !quantities[i]) continue;
    await db.insert(recipeIngredients).values({
      recipeId: recipe.id,
      ingredientId: ingredientIds[i],
      quantity: quantities[i],
      unit: units[i] || "g",
    });
  }

  redirect(`/recipes/${recipe.id}`);
}

export async function createBatch(formData: FormData) {
  const recipeId = Number(formData.get("recipeId"));
  const label = String(formData.get("label") ?? "").trim() || "Batch";
  const multiplier = Math.max(0.1, Number(formData.get("multiplier") ?? 1));

  const [batch] = await db
    .insert(batches)
    .values({ recipeId, label, multiplier })
    .returning({ id: batches.id });

  redirect(`/batches/${batch.id}`);
}

export async function deleteRecipe(id: number) {
  await db.delete(recipes).where(eq(recipes.id, id));
  revalidatePath("/");
  redirect("/");
}

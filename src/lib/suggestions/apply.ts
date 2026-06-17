import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ingredients, recipeIngredients } from "@/lib/db/schema";
import type { SuggestionAction } from "@/lib/suggestions/ollama";
import { resolveSuggestionAction } from "@/lib/suggestions/infer";

export async function applySuggestionToRecipe(
  recipeId: number,
  suggestion: SuggestionAction,
): Promise<void> {
  const action = resolveSuggestionAction(suggestion);

  if (action === "swap" && suggestion.ingredient_id && suggestion.new_ingredient_id) {
    const line = await db
      .select()
      .from(recipeIngredients)
      .where(
        and(
          eq(recipeIngredients.recipeId, recipeId),
          eq(recipeIngredients.ingredientId, suggestion.ingredient_id),
        ),
      )
      .get();
    if (line) {
      await db
        .update(recipeIngredients)
        .set({ ingredientId: suggestion.new_ingredient_id })
        .where(eq(recipeIngredients.id, line.id));
    }
    return;
  }

  if (action === "add" && suggestion.new_ingredient_id) {
    const ing = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.id, suggestion.new_ingredient_id))
      .get();
    if (!ing) return;

    await db.insert(recipeIngredients).values({
      recipeId,
      ingredientId: suggestion.new_ingredient_id,
      quantity: suggestion.quantity ?? 100,
      unit: suggestion.unit ?? ing.defaultUnit,
    });
    return;
  }

  if (action === "remove" && suggestion.ingredient_id) {
    await db
      .delete(recipeIngredients)
      .where(
        and(
          eq(recipeIngredients.recipeId, recipeId),
          eq(recipeIngredients.ingredientId, suggestion.ingredient_id),
        ),
      );
    return;
  }

  if (action === "adjust" && suggestion.ingredient_id) {
    const lines = await db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipeId));

    const line = lines.find((l) => l.ingredientId === suggestion.ingredient_id);
    if (line && suggestion.quantity != null) {
      await db
        .update(recipeIngredients)
        .set({
          quantity: suggestion.quantity,
          unit: suggestion.unit ?? line.unit,
        })
        .where(eq(recipeIngredients.id, line.id));
    }
  }
}

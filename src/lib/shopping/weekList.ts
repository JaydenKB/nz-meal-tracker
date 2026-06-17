import type { Ingredient, Store, StoreProduct } from "@/lib/db/schema";
import type { LogEntryWithMeta } from "@/lib/log/compute";
import { getRecipeWithDetails } from "@/lib/queries";
import {
  conversionFailureMessage,
  formatCanonicalAmount,
  fromCanonicalForDisplay,
  toCanonicalAmount,
  type CanonicalUnit,
} from "@/lib/pantry/canonical";
import type { PantryRow } from "@/lib/pantry/queries";
import {
  buildShoppingListCore,
  type OwnedListItem,
  type PantryAwareShoppingList,
  type RecipeLineForShopping,
} from "@/lib/shopping/buildList";
import { db } from "@/lib/db";
import { ingredients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type AggregatedNeed = {
  ingredient: Ingredient;
  amount: number;
  unit: CanonicalUnit;
  requiredDisplay: string;
};

async function aggregateRequiredCanonical(
  entries: Pick<LogEntryWithMeta, "recipeId" | "ingredientId" | "servings">[],
): Promise<Map<number, AggregatedNeed>> {
  const map = new Map<number, AggregatedNeed>();

  for (const entry of entries) {
    if (entry.recipeId) {
      const details = await getRecipeWithDetails(entry.recipeId);
      if (!details) continue;
      const scale = entry.servings / Math.max(1, details.recipe.servings);

      for (const line of details.lines) {
        const scaledQty = line.quantity * scale;
        const converted = toCanonicalAmount(scaledQty, line.unit, line.ingredient);
        if (!converted.ok) continue;

        const existing = map.get(line.ingredient.id);
        if (existing && existing.unit === converted.unit) {
          existing.amount += converted.amount;
          existing.requiredDisplay = formatCanonicalAmount(existing.amount, existing.unit);
        } else if (!existing) {
          map.set(line.ingredient.id, {
            ingredient: line.ingredient,
            amount: converted.amount,
            unit: converted.unit,
            requiredDisplay: formatCanonicalAmount(converted.amount, converted.unit),
          });
        }
      }
      continue;
    }

    if (entry.ingredientId) {
      const ing =
        map.get(entry.ingredientId)?.ingredient ??
        (await db.select().from(ingredients).where(eq(ingredients.id, entry.ingredientId)).get());
      if (!ing) continue;

      const converted = toCanonicalAmount(entry.servings, ing.defaultUnit, ing);
      if (!converted.ok) continue;

      const existing = map.get(ing.id);
      if (existing && existing.unit === converted.unit) {
        existing.amount += converted.amount;
        existing.requiredDisplay = formatCanonicalAmount(existing.amount, existing.unit);
      } else if (!existing) {
        map.set(ing.id, {
          ingredient: ing,
          amount: converted.amount,
          unit: converted.unit,
          requiredDisplay: formatCanonicalAmount(converted.amount, converted.unit),
        });
      }
    }
  }

  return map;
}

/** Sum ingredients across meals, subtract pantry once, then build purchasable list. */
export async function buildWeekShoppingList(
  entries: Pick<LogEntryWithMeta, "recipeId" | "ingredientId" | "servings">[],
  products: (StoreProduct & { store: Store; ingredient: Ingredient })[],
  pantryMap: Map<number, PantryRow>,
): Promise<PantryAwareShoppingList> {
  const aggregated = await aggregateRequiredCanonical(entries);
  const owned: OwnedListItem[] = [];
  const cantAutoDeduct: PantryAwareShoppingList["cantAutoDeduct"] = [];
  const adjustedLines: RecipeLineForShopping[] = [];

  for (const [, req] of aggregated) {
    const converted = toCanonicalAmount(req.amount, req.unit, req.ingredient);
    if (!converted.ok) {
      cantAutoDeduct.push({
        ingredientId: req.ingredient.id,
        ingredientName: req.ingredient.name,
        reason: conversionFailureMessage(converted.reason),
      });
      const display = fromCanonicalForDisplay(req.amount, req.ingredient);
      adjustedLines.push({
        quantity: display.quantity,
        unit: display.unit,
        ingredient: req.ingredient,
      });
      continue;
    }

    const pantry = pantryMap.get(req.ingredient.id);
    const onHand = pantry?.quantity ?? 0;
    const neededCanonical = Math.max(0, converted.amount - onHand);

    const pantryDisplay = pantry
      ? formatCanonicalAmount(pantry.quantity, pantry.unit as CanonicalUnit)
      : "0";

    if (neededCanonical <= 0) {
      owned.push({
        ingredientId: req.ingredient.id,
        ingredientName: req.ingredient.name,
        pantryDisplay,
        neededDisplay: req.requiredDisplay,
      });
      continue;
    }

    const display = fromCanonicalForDisplay(neededCanonical, req.ingredient);
    adjustedLines.push({
      quantity: display.quantity,
      unit: display.unit,
      ingredient: req.ingredient,
    });
  }

  return {
    groups: buildShoppingListCore(adjustedLines, products),
    owned,
    skippedCount: owned.length,
    cantAutoDeduct,
  };
}

export { aggregateRequiredCanonical };

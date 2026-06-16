import type { Ingredient, Store, StoreProduct } from "@/lib/db/schema";
import { convertQuantity, formatQuantity, normalizeForNutrition } from "@/lib/nutrition/units";

export type RecipeLineForShopping = {
  quantity: number;
  unit: string;
  ingredient: Ingredient;
};

export type ShoppingListItem = {
  ingredientId: number;
  ingredientName: string;
  neededDisplay: string;
  productName: string;
  packages: number;
  packageDisplay: string;
  notes?: string | null;
};

export type ShoppingListGroup = {
  store: Store | null;
  items: ShoppingListItem[];
};

export function buildShoppingList(
  lines: RecipeLineForShopping[],
  products: (StoreProduct & { store: Store; ingredient: Ingredient })[],
  multiplier: number,
): ShoppingListGroup[] {
  const byStore = new Map<number | "unlinked", ShoppingListGroup>();
  const unlinkedKey = "unlinked" as const;

  for (const line of lines) {
    const scaledQty = line.quantity * multiplier;
    const ingredientProducts = products
      .filter((p) => p.ingredientId === line.ingredient.id)
      .sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred));

    const { amount, basis } = normalizeForNutrition(
      scaledQty,
      line.unit,
      line.ingredient.defaultUnit,
    );

    const neededDisplay =
      basis === "perEach"
        ? formatQuantity(scaledQty, line.unit)
        : formatQuantity(amount, line.ingredient.defaultUnit === "each" ? "g" : line.ingredient.defaultUnit);

    if (ingredientProducts.length === 0) {
      const group = byStore.get(unlinkedKey) ?? {
        store: null,
        items: [],
      };
      group.items.push({
        ingredientId: line.ingredient.id,
        ingredientName: line.ingredient.name,
        neededDisplay,
        productName: "No store link",
        packages: 0,
        packageDisplay: "—",
      });
      byStore.set(unlinkedKey, group);
      continue;
    }

    const product = ingredientProducts[0];
    let packages = 1;

    try {
      if (line.ingredient.defaultUnit === "each" || product.packageUnit === "each") {
        packages = Math.ceil(scaledQty / product.packageSize);
      } else {
        const neededInPackageUnit = convertQuantity(
          amount,
          line.ingredient.defaultUnit === "each" ? "g" : getBaseUnit(line.unit, line.ingredient.defaultUnit),
          product.packageUnit,
        );
        packages = Math.max(1, Math.ceil(neededInPackageUnit / product.packageSize));
      }
    } catch {
      packages = 1;
    }

    const group = byStore.get(product.storeId) ?? {
      store: product.store,
      items: [],
    };

    group.items.push({
      ingredientId: line.ingredient.id,
      ingredientName: line.ingredient.name,
      neededDisplay,
      productName: product.productName,
      packages,
      packageDisplay: `${product.packageSize} ${product.packageUnit}`,
      notes: product.notes,
    });

    byStore.set(product.storeId, group);
  }

  const groups = Array.from(byStore.values());
  groups.sort((a, b) => {
    if (!a.store) return 1;
    if (!b.store) return -1;
    return a.store.name.localeCompare(b.store.name);
  });

  return groups;
}

function getBaseUnit(unit: string, defaultUnit: string): string {
  if (["g", "kg", "oz", "lb"].includes(unit)) return "g";
  if (["ml", "l", "tsp", "tbsp", "cup"].includes(unit)) return "ml";
  return defaultUnit === "each" ? "each" : defaultUnit;
}

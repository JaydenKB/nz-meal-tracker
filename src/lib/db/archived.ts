import { isNull } from "drizzle-orm";
import { ingredients, recipes, stores } from "@/lib/db/schema";

/** SQL filters — archived rows remain in DB for referential integrity. */
export const notArchivedIngredient = isNull(ingredients.archivedAt);
export const notArchivedRecipe = isNull(recipes.archivedAt);
export const notArchivedStore = isNull(stores.archivedAt);

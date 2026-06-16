import { normalizeUnit } from "@/lib/nutrition/units";
import { stripStepNumber } from "@/lib/recipes/format-method";
import type { RawGeneratedRecipe, RecipeBatchPayload } from "./types";

export function parseGeneratedRecipesJson(raw: string): RawGeneratedRecipe[] {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  const parsed = JSON.parse(text) as unknown;
  return normalizeRecipeBatch(parsed);
}

export function normalizeRecipeBatch(parsed: unknown): RawGeneratedRecipe[] {
  if (Array.isArray(parsed)) {
    return parsed.map(normalizeRecipe);
  }

  if (parsed && typeof parsed === "object" && "recipes" in parsed) {
    const arr = (parsed as RecipeBatchPayload).recipes;
    if (Array.isArray(arr)) return arr.map(normalizeRecipe);
  }

  throw new Error("Expected JSON with a recipes array");
}

function normalizeRecipe(item: unknown): RawGeneratedRecipe {
  if (!item || typeof item !== "object") throw new Error("Invalid recipe");
  const o = item as Record<string, unknown>;
  const ingredients = Array.isArray(o.ingredients) ? o.ingredients : [];

  return {
    name: String(o.name ?? "Untitled recipe"),
    servings: Math.max(1, Number(o.servings ?? 2)),
    ingredients: ingredients.map((ing) => {
      const i = ing as Record<string, unknown>;
      const libraryId =
        i.library_id != null && i.library_id !== "" ? Number(i.library_id) : undefined;
      return {
        name: String(i.name ?? ""),
        amount: Number(i.amount ?? 0),
        unit: normalizeUnit(String(i.unit ?? "g"), "g"),
        library_id: libraryId != null && !Number.isNaN(libraryId) ? libraryId : undefined,
      };
    }),
    method: Array.isArray(o.method)
      ? o.method.map((s) => stripStepNumber(String(s))).filter(Boolean)
      : [],
  };
}

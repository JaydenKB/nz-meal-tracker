import type { AppSettings } from "@/lib/db/schema";
import { aiGenerateText } from "@/lib/ai/provider";

export type SuggestionAction = {
  change: string;
  reason: string;
  score_delta: number;
  new_ingredient_id?: number;
  action?: "swap" | "add" | "remove" | "adjust";
  ingredient_id?: number;
  quantity?: number;
  unit?: string;
};

export function parseSuggestionsJson(raw: string): SuggestionAction[] {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  const parsed = JSON.parse(text) as unknown;

  if (Array.isArray(parsed)) {
    return parsed.map(normalizeSuggestion);
  }

  if (parsed && typeof parsed === "object" && "suggestions" in parsed) {
    const arr = (parsed as { suggestions: unknown }).suggestions;
    if (Array.isArray(arr)) return arr.map(normalizeSuggestion);
  }

  throw new Error("Expected a JSON array of suggestions");
}

function normalizeSuggestion(item: unknown): SuggestionAction {
  if (!item || typeof item !== "object") throw new Error("Invalid suggestion item");
  const o = item as Record<string, unknown>;
  return {
    change: String(o.change ?? ""),
    reason: String(o.reason ?? ""),
    score_delta: Number(o.score_delta ?? 0),
    new_ingredient_id: o.new_ingredient_id != null ? Number(o.new_ingredient_id) : undefined,
    action: o.action as SuggestionAction["action"],
    ingredient_id: o.ingredient_id != null ? Number(o.ingredient_id) : undefined,
    quantity: o.quantity != null ? Number(o.quantity) : undefined,
    unit: o.unit != null ? String(o.unit) : undefined,
  };
}

export async function fetchOllamaSuggestions(
  settings: AppSettings,
  prompt: string,
): Promise<string> {
  return aiGenerateText(settings, prompt);
}

import type { ExtendedNutrients } from "@/lib/nutrition/nutrients";
import { nutrientsSummary } from "@/lib/nutrition/nutrients";

export function buildSuggestionPrompt(input: {
  recipeName: string;
  servings: number;
  ingredients: { id: number; name: string; quantity: number; unit: string }[];
  perServing: { calories: number; proteinG: number; fatG: number; carbsG: number };
  perServingNutrients?: ExtendedNutrients;
  healthScore: number;
  allIngredients: { id: number; name: string; calories: number; proteinG: number; fatG: number; carbsG: number; defaultUnit: string }[];
}): string {
  const ingredientList = input.ingredients
    .map((i) => `- id ${i.id}: ${i.name} ${i.quantity}${i.unit}`)
    .join("\n");

  const library = input.allIngredients
    .map(
      (i) =>
        `${i.id}: ${i.name} (${Math.round(i.calories)} kcal, ${i.proteinG}g P, ${i.fatG}g F, ${i.carbsG}g C per 100${i.defaultUnit})`,
    )
    .join("\n");

  const nutrientLine = input.perServingNutrients
    ? nutrientsSummary(input.perServingNutrients)
    : "limited micronutrient data";

  return `You are a practical nutrition coach helping improve a home-cooked recipe — not strip it down to bland diet food.

Recipe: ${input.recipeName} (${input.servings} servings)
Per serving: ${Math.round(input.perServing.calories)} kcal, ${input.perServing.proteinG}g protein, ${input.perServing.fatG}g fat, ${input.perServing.carbsG}g carbs
Micronutrients per serving: ${nutrientLine}
Current health score: ${input.healthScore}/100 (macros, fibre, sodium, sat fat, sugar, omega-3, vitamins & minerals)

Current ingredients:
${ingredientList}

Available ingredients (id: name · per 100g/ml macros):
${library}

Suggest 2-4 concrete improvements. Include a MIX of approaches:
- ADD nutritious ingredients (avocado, legumes, greens, nuts, yoghurt, extra veg) with specific amounts — these often boost the score via healthy fats, fibre, or protein
- SWAP to a healthier equivalent (whole grains, lean protein, lower-sodium option)
- ADJUST portions up or down when it makes sense

Do NOT only suggest removals or reductions. At least one suggestion should ADD something beneficial.
The app computes health score and macro changes — your score_delta is advisory only.

For "add" actions always include quantity (typically 50–150g) and unit (g/ml/each).
For "swap" include ingredient_id and new_ingredient_id from the lists above.

Respond with ONLY valid JSON — no markdown:
{
  "suggestions": [
    {
      "change": "Add 80g avocado",
      "reason": "Healthy monounsaturated fats and fibre — makes the meal more satisfying",
      "score_delta": 5,
      "action": "add",
      "new_ingredient_id": 12,
      "quantity": 80,
      "unit": "g"
    }
  ]
}`;
}

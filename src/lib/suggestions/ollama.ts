import type { AppSettings } from "@/lib/db/schema";

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
  const url = `${settings.ollamaBaseUrl.replace(/\/$/, "")}/api/generate`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.ollamaModel,
      prompt,
      stream: false,
      format: "json",
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama returned ${res.status}. Is it running at ${settings.ollamaBaseUrl}?`);
  }

  const data = (await res.json()) as { response?: string };
  if (!data.response) throw new Error("Empty response from Ollama");
  return data.response;
}

export function buildSuggestionPrompt(input: {
  recipeName: string;
  servings: number;
  ingredients: { id: number; name: string; quantity: number; unit: string }[];
  perServing: { calories: number; proteinG: number; fatG: number; carbsG: number };
  healthScore: number;
  allIngredients: { id: number; name: string }[];
}): string {
  const ingredientList = input.ingredients
    .map((i) => `- id ${i.id}: ${i.name} ${i.quantity}${i.unit}`)
    .join("\n");

  const library = input.allIngredients.map((i) => `${i.id}: ${i.name}`).join(", ");

  return `You are a nutrition coach. Suggest 2-4 concrete improvements for this recipe.

Recipe: ${input.recipeName} (${input.servings} servings)
Per serving: ${Math.round(input.perServing.calories)} kcal, ${input.perServing.proteinG}g protein, ${input.perServing.fatG}g fat, ${input.perServing.carbsG}g carbs
Current health score: ${input.healthScore}/100

Ingredients:
${ingredientList}

Available ingredients (id: name): ${library}

Respond with ONLY valid JSON — no markdown, no preamble. Format:
{
  "suggestions": [
    {
      "change": "short title e.g. Swap olive oil → spray",
      "reason": "one plain-English sentence",
      "score_delta": 4,
      "action": "swap|add|remove|adjust",
      "ingredient_id": 1,
      "new_ingredient_id": 2,
      "quantity": 80,
      "unit": "g"
    }
  ]
}

Use ingredient_id/new_ingredient_id from the lists above. score_delta is advisory.`;
}

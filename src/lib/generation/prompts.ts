import type { Ingredient } from "@/lib/db/schema";
import { amountRangeHint } from "./amounts";
import type { RecipeGoal, SurpriseFocus } from "./goals";
import {
  calorieTargetInstruction,
  getGoalTargets,
  goalCookingStyle,
  goalLabel,
  surpriseFocusInstructions,
  surpriseFocusLabel,
} from "./goals";
import { keywordsPromptBlock } from "./keywords";

const CHEF_PREAMBLE = `You are an experienced home chef and recipe developer based in Auckland, New Zealand.
Your job is to write recipes people genuinely WANT to cook and eat — vivid names, real techniques, satisfying flavours.
Think comfort, craveability, and "I'd make that again" — not clinical diet food.
Use specific steps (sear, deglaze, rest, season to taste). Build flavour with aromatics, acid, heat, herbs, and texture.
Do NOT invent or estimate nutrition numbers — the app calculates macros from the ingredient database. Your job is composition and amounts that land near the user's calorie target.`;

const UNIT_RULES = `Allowed units only: g, kg, ml, l, tsp, tbsp, cup, each.
For countable items (eggs, onions, garlic) use unit "each" with a number — never "whole", "piece", or "clove" as the unit.
Use g or ml for most ingredients; tsp/tbsp for small seasonings. Prefer 2–4 servings.`;

const METHOD_RULES = `Method steps (the "method" array):
- Return 5–8 detailed steps — each step is ONE string with a single clear action
- Do NOT prefix steps with numbers in the strings (the app adds 1, 2, 3… automatically)
- Guide the cook step-by-step: what to prep, heat level, timing, and sensory cues ("until fragrant", "2–3 min per side", "rest 5 min before slicing")
- Include prep (chop, season, marinate), cooking (sear, simmer, roast), and finishing (rest, plate, garnish)
- Write like you're standing beside them — specific and encouraging, never vague ("cook until done")`;

function buildCalorieLine(target?: number): string | null {
  if (!target) return null;
  return calorieTargetInstruction(target);
}

export function buildGenerationPrompt(input: {
  selectedIngredients: Ingredient[];
  goal: RecipeGoal;
  targetCaloriesPerServing?: number;
  keywords?: string[];
  count: number;
}): string {
  const targets = getGoalTargets(input.goal, input.targetCaloriesPerServing);
  const calorieTarget = input.targetCaloriesPerServing ?? targets.targetCaloriesPerServing;
  const servings = 2;
  const ingLines = input.selectedIngredients
    .map(
      (i) =>
        `- id ${i.id}: ${i.name} — nutrition per 100${i.defaultUnit}; use ${amountRangeHint(i, servings)} in the recipe`,
    )
    .join("\n");

  const constraints = [
    `Goal: ${goalLabel(input.goal)} — ${goalCookingStyle(input.goal)}`,
    buildCalorieLine(calorieTarget),
    keywordsPromptBlock(input.keywords ?? []),
    targets.minProteinPerServing
      ? `Protein: aim for at least ${targets.minProteinPerServing}g per serving through portion sizing (app-verified)`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `${CHEF_PREAMBLE}

Create ${input.count} original, craveable recipes using PRIMARILY these ingredients from the user's library:
${ingLines}

${constraints}

IMPORTANT — ingredient amounts:
- "amount" is how much to cook with in THIS recipe (total for all servings), NOT the supermarket package size.
- Size portions so the meal lands near the calorie target — use enough rice, protein, and fat to feel satisfying, not skimpy.
- Never default to 500g, 700g, 1kg, or 1000g for every ingredient. Vary amounts by role.
- Typical totals for 2 servings: protein 120–200g, vegetables 150–250g, dry rice/pasta 80–120g, oil 5–15ml.
- Use small amounts for flavour (garlic 2 each, lemon juice 15ml, spices 1 tsp).
- Each ingredient should have a different, realistic amount (e.g. 120g steak + 80g rice + 150g broccoli).

Recipe names should sound appetising (e.g. "Garlic butter salmon with lemon greens" not "Healthy salmon meal").

You may add up to 2 common pantry extras per recipe (garlic, lemon, salt, pepper, olive oil, chilli) NOT in the library — set library_id to null for those.

${UNIT_RULES}

${METHOD_RULES}

Return a JSON object with a "recipes" array. Each recipe needs: name, servings, ingredients (name, amount, unit, library_id), method (array of step strings).`;
}

export function buildSurprisePrompt(input: {
  allIngredients: Ingredient[];
  focus: SurpriseFocus;
  targetCaloriesPerServing?: number;
  keywords?: string[];
  count: number;
}): string {
  const ingLines = input.allIngredients
    .map(
      (i) =>
        `- id ${i.id}: ${i.name} (${i.calories} kcal, ${i.proteinG}g P, ${i.fatG}g F, ${i.carbsG}g C per 100${i.defaultUnit})`,
    )
    .join("\n");

  const focusLine = surpriseFocusInstructions(input.focus);
  const calorieLine = buildCalorieLine(input.targetCaloriesPerServing);

  return `${CHEF_PREAMBLE}

The user's FULL pantry / ingredient library (${input.allIngredients.length} items):
${ingLines}

Create ${input.count} original, craveable recipes. For EACH recipe:
- Pick ONLY the ingredients that fit (typically 3–8 items from the list above).
- SKIP ingredients that do not belong — you do NOT need to use everything.
- Each recipe should use a DIFFERENT combination where possible.
- Every library ingredient must include library_id from the list above.
- Names and methods should make the cook hungry — specific, sensory, rewarding.

Focus: ${surpriseFocusLabel(input.focus)} — ${focusLine}
${calorieLine ? `\n${calorieLine}` : ""}
${keywordsPromptBlock(input.keywords ?? []) ? `\n${keywordsPromptBlock(input.keywords ?? [])}` : ""}

IMPORTANT — ingredient amounts:
- "amount" is how much to cook with in THIS recipe (total for all servings), NOT package size.
- Portion for the calorie target — satisfying servings, not austere ones.
- Vary amounts realistically (e.g. 120g protein + 80g carbs + 150g veg). Never use 1kg of everything.

You may add up to 2 common pantry extras NOT in the library — set library_id to null for those.

${UNIT_RULES}

${METHOD_RULES}

Return a JSON object with a "recipes" array. Each recipe needs: name, servings, ingredients (name, amount, unit, library_id), method (array of step strings).`;
}

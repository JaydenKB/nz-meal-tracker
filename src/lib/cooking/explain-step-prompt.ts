import type { StepIngredient } from "./match-ingredients";
import { formatStepIngredientLine } from "./match-ingredients";

export type ExplainMode = "normal" | "simpler";

export function buildExplainStepPrompt(input: {
  recipeName: string;
  servings: number;
  stepIndex: number;
  stepText: string;
  stepIngredients: StepIngredient[];
  mode: ExplainMode;
}): string {
  const ingLines =
    input.stepIngredients.length > 0
      ? input.stepIngredients.map(formatStepIngredientLine).join("\n")
      : "(Use only ingredients already in this recipe — do not invent extras.)";

  const tone =
    input.mode === "simpler"
      ? `Explain in the SIMPLEST possible way — short sentences, zero jargon, as if the reader has never cooked before.`
      : `Explain for a beginner home cook — practical, encouraging, specific.`;

  return `You are a friendly cooking coach helping someone follow a recipe step-by-step.

Recipe: "${input.recipeName}" (${input.servings} servings)
Step ${input.stepIndex + 1}: ${input.stepText}

Ingredients for this step:
${ingLines}

${tone}

Write ONE short paragraph (3–5 sentences max) that expands ONLY on this step:
- Technique cues (heat level, pan choice, how to move food in the pan)
- What to look, listen, and smell for
- Clear doneness signals (colour, texture, temperature if relevant)
- One common mistake to avoid

Rules:
- Stay grounded in the actual step and listed ingredients — do NOT invent ingredients or steps
- Do NOT repeat the step verbatim — add useful detail
- Plain prose only — no markdown, no bullet points, no numbering
- Do not mention that you are an AI`;
}

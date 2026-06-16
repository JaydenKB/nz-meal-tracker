export type RecipeGoal = "high_protein" | "low_cal" | "balanced" | "vegetarian";

export type SurpriseFocus = "healthy" | "macros" | "tasty" | "easy";

export type GenerateMode = "pick" | "surprise";

export const RECIPE_GOALS: { id: RecipeGoal; label: string }[] = [
  { id: "high_protein", label: "High protein" },
  { id: "low_cal", label: "Light & filling" },
  { id: "balanced", label: "Balanced" },
  { id: "vegetarian", label: "Vegetarian" },
];

export const SURPRISE_FOCUSES: {
  id: SurpriseFocus;
  label: string;
  hint: string;
}[] = [
  { id: "healthy", label: "Fresh", hint: "Veg-forward · still satisfying" },
  { id: "macros", label: "Macros", hint: "Hit protein & calorie targets" },
  { id: "tasty", label: "Tasty", hint: "Bold flavours · craveable" },
  { id: "easy", label: "Easy", hint: "Quick · minimal steps" },
];

/** Acceptable variance when the app nudges amounts toward the user's calorie target. */
export const CALORIE_TARGET_TOLERANCE = 0.12;

export type GoalTargets = {
  minProteinPerServing?: number;
  targetCaloriesPerServing?: number;
  preferProteinDensity?: boolean;
};

export function getGoalTargets(goal: RecipeGoal, calorieTarget?: number): GoalTargets {
  const target = calorieTarget ?? undefined;

  switch (goal) {
    case "high_protein":
      return {
        minProteinPerServing: 30,
        targetCaloriesPerServing: target ?? 650,
        preferProteinDensity: true,
      };
    case "low_cal":
      return { targetCaloriesPerServing: target ?? 450, minProteinPerServing: 15 };
    case "balanced":
      return { targetCaloriesPerServing: target ?? 600, minProteinPerServing: 20 };
    case "vegetarian":
      return { targetCaloriesPerServing: target ?? 550, minProteinPerServing: 15 };
    default:
      return { targetCaloriesPerServing: target ?? 600 };
  }
}

export function goalLabel(goal: RecipeGoal): string {
  return RECIPE_GOALS.find((g) => g.id === goal)?.label ?? goal;
}

export function goalSummary(goal: RecipeGoal, calorieTarget?: number): string {
  const label = goalLabel(goal);
  if (calorieTarget) return `${label} · ~${calorieTarget} kcal/serving target`;
  const targets = getGoalTargets(goal);
  if (targets.targetCaloriesPerServing) {
    return `${label} · ~${targets.targetCaloriesPerServing} kcal/serving target`;
  }
  return label;
}

export function surpriseFocusLabel(focus: SurpriseFocus): string {
  return SURPRISE_FOCUSES.find((f) => f.id === focus)?.label ?? focus;
}

export function surpriseSummary(focus: SurpriseFocus, calorieTarget?: number): string {
  const label = surpriseFocusLabel(focus);
  if (calorieTarget) return `Surprise me · ${label} · ~${calorieTarget} kcal/serving target`;
  return `Surprise me · ${label}`;
}

export function goalCookingStyle(goal: RecipeGoal): string {
  switch (goal) {
    case "high_protein":
      return "Make it genuinely delicious — seared crusts, marinades, garlic butter, fresh herbs. Not plain boiled chicken and rice.";
    case "low_cal":
      return "Light but satisfying — big flavours, texture contrast, and portions that feel like a real meal, not sad diet food.";
    case "balanced":
      return "Crowd-pleasing and comforting — the kind of meal someone looks forward to cooking again.";
    case "vegetarian":
      return "Hearty and full of character — spices, acidity, crunch, or richness so it feels substantial, not an afterthought.";
    default:
      return "Make it something the cook will actually want to eat tonight.";
  }
}

export function surpriseFocusInstructions(focus: SurpriseFocus): string {
  switch (focus) {
    case "healthy":
      return "Fresh and nourishing, but still craveable — char, spice, citrus, herbs, and satisfying textures. Never bland 'health food'.";
    case "macros":
      return "Hit the calorie and protein targets with portion sizes that make sense — still tasty, not stripped-down.";
    case "tasty":
      return "Prioritise flavour first — herbs, spices, acidity, umami, a little fat where it counts. The dish should feel rewarding.";
    case "easy":
      return "Keep it simple — one pan or pot where possible, ≤6 steps, common techniques only, ≤30 min active cooking. Still tasty.";
    default:
      return "";
  }
}

export function calorieTargetInstruction(target: number): string {
  return `Calorie target: aim for ~${target} kcal per serving (roughly ±10%). Size ingredient amounts to land near this — not a strict cap, but the number the user asked for. A 580 kcal or 620 kcal meal is fine when the target is ${target}; a 350 kcal salad when they asked for ${target} is not.`;
}

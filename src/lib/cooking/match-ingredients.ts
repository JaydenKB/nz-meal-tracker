export type StepIngredient = {
  name: string;
  quantity: number;
  unit: string;
};

/** Match ingredients mentioned in a cooking step (keyword-based). */
export function ingredientsForStep(step: string, all: StepIngredient[]): StepIngredient[] {
  const lower = step.toLowerCase();
  const matched = all.filter((line) => ingredientMentionedInStep(lower, line.name));

  if (matched.length > 0) return matched;

  const pantryTerms = ["salt", "pepper", "oil", "butter", "water"];
  return all.filter((line) => {
    const name = line.name.toLowerCase();
    return pantryTerms.some((term) => name.includes(term) && lower.includes(term));
  });
}

function ingredientMentionedInStep(stepLower: string, ingredientName: string): boolean {
  const name = ingredientName.toLowerCase();
  if (name.length >= 3 && stepLower.includes(name)) return true;

  const words = name.split(/\s+/).filter((w) => w.length > 3);
  if (words.some((w) => stepLower.includes(w))) return true;

  const head = name.split(/\s+/)[0];
  return head.length >= 4 && stepLower.includes(head);
}

export function formatStepIngredientLine(line: StepIngredient): string {
  const qty =
    line.unit === "each" && Number.isInteger(line.quantity)
      ? String(line.quantity)
      : String(line.quantity);
  return `${qty} ${line.unit} ${line.name}`;
}

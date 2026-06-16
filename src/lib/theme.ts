const RECIPE_ACCENTS = ["#b8e6d5", "#f5d5b8", "#f5c6d5", "#c8dff5", "#e8dff5"];

export function getRecipeAccent(index: number): string {
  return RECIPE_ACCENTS[index % RECIPE_ACCENTS.length];
}

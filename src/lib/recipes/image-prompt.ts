export function buildRecipeImagePrompt(name: string, ingredientNames: string[]): string {
  const ingredients =
    ingredientNames.length > 0
      ? ingredientNames.slice(0, 6).join(", ")
      : "fresh seasonal produce";

  return [
    `Ultra-realistic food photograph of "${name}", a freshly cooked home meal.`,
    `Plated naturally on a simple ceramic plate or bowl with visible ingredients: ${ingredients}.`,
    "Natural window light, soft shadows, shallow depth of field, subtle steam if the dish is hot.",
    "Rich but believable colours — appetising, mouth-watering, and tasty-looking, not stylised, illustrated, or CGI.",
    "45-degree angle like a modern food blog or Bon Appétit test kitchen.",
    "No text, no watermark, no hands, no faces, no logos.",
  ].join(" ");
}

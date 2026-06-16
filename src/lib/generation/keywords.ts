/** Parse comma/semicolon-separated recipe style keywords from user input. */
export function parseRecipeKeywords(raw?: string | string[] | null): string[] {
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean).slice(0, 8);
  }
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function keywordsPromptBlock(keywords: string[]): string | null {
  if (keywords.length === 0) return null;

  return `User style keywords: ${keywords.join(", ")}
Use these to guide the meal and cooking style:
- Meal time (breakfast, lunch, dinner, snack) → appropriate portion size, energy level, and ingredients
- Format or cuisine (pasta, salad, bowl, stir-fry, soup, curry) → shape the dish around that style using library ingredients
- Vibe (quick, comfort, fresh, spicy) → method and flavour profile
Keywords should noticeably influence recipe names, ingredient selection from the library, and cooking steps.`;
}

export function keywordsSummarySuffix(keywords: string[]): string {
  if (keywords.length === 0) return "";
  return ` · ${keywords.join(", ")}`;
}

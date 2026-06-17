import type { SuggestionAction } from "@/lib/suggestions/ollama";

/** Infer action from change text when the model omits `action`. */
export function inferSuggestionAction(change: string): SuggestionAction["action"] {
  const lower = change.toLowerCase();
  if (lower.includes("swap") || lower.includes("→") || lower.includes("->") || lower.includes("replace"))
    return "swap";
  if (lower.includes("add") || lower.includes("include") || lower.includes("stir in")) return "add";
  if (lower.includes("remove") || lower.includes("omit") || lower.includes("skip")) return "remove";
  if (lower.includes("reduce") || lower.includes("lower") || lower.includes("cut") || lower.includes("less"))
    return "adjust";
  if (lower.includes("increase") || lower.includes("more") || lower.includes("extra")) return "adjust";
  return "adjust";
}

export function resolveSuggestionAction(s: SuggestionAction): SuggestionAction["action"] {
  return s.action ?? inferSuggestionAction(s.change);
}

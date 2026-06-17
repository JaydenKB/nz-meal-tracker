import type { Ingredient } from "@/lib/db/schema";
import type { DetectedGrocery, VisionConfidence } from "@/lib/import/grocery-detect";
import { buildLookupQueries, scoreNameMatch } from "@/lib/nutrition/lookup/normalize";

export type MatchBucket = "matched" | "not_sure" | "new";

export type LibraryMatchResult = {
  bucket: MatchBucket;
  score: number;
  ingredientId: number | null;
  ingredientName: string | null;
  bestGuessId: number | null;
  bestGuessName: string | null;
  descriptorConflict: boolean;
};

const MATCH_SCORE_THRESHOLD = 72;
const NOT_SURE_SCORE_THRESHOLD = 42;

/** Words that distinguish similar products — must align between query and candidate. */
const DISCRIMINATORS = [
  "breast",
  "thigh",
  "drumstick",
  "wing",
  "mince",
  "fillet",
  "steak",
  "loin",
  "skim",
  "trim",
  "light",
  "full fat",
  "low fat",
  "unsalted",
  "salted",
  "smoked",
  "raw",
  "cooked",
  "baby",
  "silverbeet",
  "spinach",
  "kale",
  "red",
  "green",
  "yellow",
  "white",
  "brown",
  "whole",
  "ground",
  "diced",
  "sliced",
];

function extractDiscriminators(text: string): Set<string> {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const word of DISCRIMINATORS) {
    if (lower.includes(word)) found.add(word);
  }
  return found;
}

function hasDescriptorConflict(query: string, candidate: string): boolean {
  const qDisc = extractDiscriminators(query);
  const cDisc = extractDiscriminators(candidate);
  if (qDisc.size === 0 || cDisc.size === 0) return false;

  for (const q of qDisc) {
    if (!cDisc.has(q)) {
      for (const c of cDisc) {
        if (c !== q) return true;
      }
    }
  }
  return false;
}

function bestLibraryScore(
  queries: string[],
  library: Ingredient[],
): { ingredient: Ingredient; score: number; conflict: boolean } | null {
  let best: { ingredient: Ingredient; score: number; conflict: boolean } | null = null;

  for (const ingredient of library) {
    let maxScore = 0;
    let conflict = false;

    for (const q of queries) {
      const s = scoreNameMatch(q, ingredient.name);
      if (s > maxScore) maxScore = s;
      if (hasDescriptorConflict(q, ingredient.name)) conflict = true;
    }

    if (conflict) maxScore = Math.max(0, maxScore - 55);

    if (!best || maxScore > best.score) {
      best = { ingredient, score: maxScore, conflict };
    }
  }

  return best && best.score > 0 ? best : null;
}

function classifyBucket(
  score: number,
  visionConfidence: VisionConfidence,
  descriptorConflict: boolean,
): MatchBucket {
  if (descriptorConflict || score < NOT_SURE_SCORE_THRESHOLD) return "new";

  const visionOk = visionConfidence === "high" || visionConfidence === "medium";
  if (score >= MATCH_SCORE_THRESHOLD && visionOk && !descriptorConflict) return "matched";

  if (score >= NOT_SURE_SCORE_THRESHOLD) return "not_sure";

  return "new";
}

export function matchDetectedToLibrary(
  detected: DetectedGrocery,
  library: Ingredient[],
): LibraryMatchResult {
  const searchText = [detected.guessName, detected.brand].filter(Boolean).join(" ");
  const queries = buildLookupQueries(searchText);
  const best = bestLibraryScore(queries, library);

  if (!best) {
    return {
      bucket: "new",
      score: 0,
      ingredientId: null,
      ingredientName: null,
      bestGuessId: null,
      bestGuessName: null,
      descriptorConflict: false,
    };
  }

  const bucket = classifyBucket(best.score, detected.confidence, best.conflict);

  return {
    bucket,
    score: best.score,
    ingredientId: bucket === "matched" ? best.ingredient.id : null,
    ingredientName: bucket === "matched" ? best.ingredient.name : null,
    bestGuessId: bucket === "not_sure" ? best.ingredient.id : null,
    bestGuessName: bucket === "not_sure" ? best.ingredient.name : null,
    descriptorConflict: best.conflict,
  };
}

export function matchGroceryList(
  items: DetectedGrocery[],
  library: Ingredient[],
): Array<DetectedGrocery & LibraryMatchResult> {
  return items.map((item) => ({
    ...item,
    ...matchDetectedToLibrary(item, library),
  }));
}

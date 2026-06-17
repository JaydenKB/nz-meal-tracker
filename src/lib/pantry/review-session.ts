import type { MatchBucket } from "@/lib/import/match-library";
import type { RestockReviewItem } from "@/lib/import/photo-restock-types";

export type PantryItemSource = "barcode" | "photo" | "label" | "library" | "shopping";

export type PantryReviewLine = {
  id: string;
  source: PantryItemSource;
  ingredientId: number | null;
  name: string;
  detectedName?: string;
  quantity: number | null;
  unit: string;
  confirmed: boolean;
  needsAction: boolean;
  warning?: string;
  /** Photo-only: unmatched item needs label scan */
  photoBucket?: MatchBucket;
  bestGuessId?: number | null;
  bestGuessName?: string | null;
  barcode?: string;
};

export type PantryReviewSession = {
  items: PantryReviewLine[];
  /** Ingredient IDs added in last confirm — for cook handoff */
  lastAddedIngredientIds?: number[];
  /** Cook-now count after last add */
  lastCookNowCount?: number;
  /** Recipe IDs newly cookable after last add — for highlight handoff */
  lastCookNowRecipeIds?: number[];
};

const SESSION_KEY = "pantry-review-session";
const RECONCILE_KEY = "pantry-last-reconcile";

export function loadPantryReviewSession(): PantryReviewSession {
  if (typeof window === "undefined") return { items: [] };
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { items: [] };
    return JSON.parse(raw) as PantryReviewSession;
  } catch {
    return { items: [] };
  }
}

export function savePantryReviewSession(session: PantryReviewSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearPantryReviewSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function appendPantryReviewLines(lines: PantryReviewLine[]): void {
  const session = loadPantryReviewSession();
  const existingIds = new Set(session.items.map((i) => i.id));
  const merged = [...session.items];
  for (const line of lines) {
    if (existingIds.has(line.id)) continue;
    merged.push(line);
    existingIds.add(line.id);
  }
  savePantryReviewSession({ ...session, items: merged });
}

export function setPantryReviewLines(lines: PantryReviewLine[]): void {
  const session = loadPantryReviewSession();
  savePantryReviewSession({ ...session, items: lines });
}

export function setLastAddHandoff(
  ingredientIds: number[],
  cookNowCount: number,
  cookNowRecipeIds: number[] = [],
): void {
  const session = loadPantryReviewSession();
  savePantryReviewSession({
    ...session,
    items: [],
    lastAddedIngredientIds: ingredientIds,
    lastCookNowCount: cookNowCount,
    lastCookNowRecipeIds: cookNowRecipeIds,
  });
}

export function restockItemToReviewLine(item: RestockReviewItem): PantryReviewLine {
  const needsAction =
    item.bucket === "new" ||
    item.bucket === "not_sure" ||
    item.quantity == null ||
    item.quantity <= 0;

  return {
    id: item.id,
    source: "photo",
    ingredientId: item.ingredientId,
    name: item.ingredientName ?? item.detectedName,
    detectedName: item.detectedName,
    quantity: item.quantity,
    unit: item.unit,
    confirmed: item.bucket === "matched" && item.confirmed && !needsAction,
    needsAction,
    warning: item.conversionWarning,
    photoBucket: item.bucket,
    bestGuessId: item.bestGuessId,
    bestGuessName: item.bestGuessName,
  };
}

export function shoppingItemToReviewLine(input: {
  ingredientId: number;
  name: string;
  quantity: number;
  unit: string;
}): PantryReviewLine {
  return {
    id: `shop-${input.ingredientId}-${Date.now()}`,
    source: "shopping",
    ingredientId: input.ingredientId,
    name: input.name,
    quantity: input.quantity,
    unit: input.unit,
    confirmed: true,
    needsAction: false,
  };
}

export function barcodeToReviewLine(input: {
  ingredientId: number;
  name: string;
  quantity: number;
  unit: string;
  barcode: string;
}): PantryReviewLine {
  return {
    id: `barcode-${input.barcode}-${Date.now()}`,
    source: "barcode",
    ingredientId: input.ingredientId,
    name: input.name,
    quantity: input.quantity,
    unit: input.unit,
    confirmed: true,
    needsAction: false,
    barcode: input.barcode,
  };
}

export function libraryItemToReviewLine(input: {
  ingredientId: number;
  name: string;
  quantity?: number;
  unit?: string;
  source?: PantryItemSource;
}): PantryReviewLine {
  return {
    id: `lib-${input.ingredientId}-${Date.now()}`,
    source: input.source ?? "library",
    ingredientId: input.ingredientId,
    name: input.name,
    quantity: input.quantity ?? null,
    unit: input.unit ?? "g",
    confirmed: false,
    needsAction: input.quantity == null || input.quantity <= 0,
  };
}

export function sourceLabel(source: PantryItemSource): string {
  switch (source) {
    case "barcode":
      return "barcode";
    case "photo":
      return "photo";
    case "label":
      return "label";
    case "library":
      return "library";
    case "shopping":
      return "shopping";
  }
}

export function markPantryReconciled(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RECONCILE_KEY, new Date().toISOString());
}

export function getLastReconcileTime(): Date | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(RECONCILE_KEY);
  return raw ? new Date(raw) : null;
}

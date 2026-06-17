import type { BarcodeDraft } from "@/lib/import/barcode-types";

type CacheEntry = {
  draft: BarcodeDraft | null;
  expires: number;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

export function getCachedBarcodeDraft(barcode: string): BarcodeDraft | null | undefined {
  const entry = cache.get(barcode);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    cache.delete(barcode);
    return undefined;
  }
  return entry.draft;
}

export function setCachedBarcodeDraft(barcode: string, draft: BarcodeDraft | null): void {
  cache.set(barcode, { draft, expires: Date.now() + CACHE_TTL_MS });
}

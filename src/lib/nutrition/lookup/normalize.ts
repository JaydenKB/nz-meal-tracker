const STORE_NOISE =
  /\b(woolworths|countdown|pak[\s']?n[\s']?save|new world|fresh choice|four square|super value|mt eden|westmere|pams|homebrand|macro|essentials|select|value|prepacked|pre-packed|loose|bagged|bunch|each|approx|approx\.|per kg|per 100g)\b/gi;

const SIZE_NOISE = /\b\d+(\.\d+)?\s*(g|kg|ml|l|litre|liter|pk|pack|ct|count|ea)\b/gi;

const PLURAL_EXCEPTIONS = new Set(["rice", "oats", "quinoa", "spinach", "broccoli", "salmon", "mince"]);

export function buildLookupQueries(productName: string): string[] {
  const raw = productName.trim();
  const variants: string[] = [];
  const seen = new Set<string>();

  const add = (s: string) => {
    const v = s.replace(/\s+/g, " ").trim();
    if (v.length >= 2 && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      variants.push(v);
    }
  };

  add(raw);

  let cleaned = raw.toLowerCase();
  cleaned = cleaned.replace(STORE_NOISE, " ");
  cleaned = cleaned.replace(SIZE_NOISE, " ");
  cleaned = cleaned.replace(/\b(free range|organic|raw|cooked|fresh|frozen|sliced|diced|boneless|skinless)\b/gi, " $1 ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  const words = cleaned.split(" ").filter(Boolean);
  const last = words[words.length - 1];

  // Try singular core food name before plural / noisy variants
  if (last && last.endsWith("s") && last.length > 3 && !PLURAL_EXCEPTIONS.has(last)) {
    const singular = last.slice(0, -1);
    add(words.slice(0, -1).concat(singular).join(" "));
    add(singular);
  }

  add(cleaned);
  if (words.length > 1) {
    add(words.slice(-2).join(" "));
    add(words.slice(-3).join(" "));
  }
  if (words.length >= 1) add(words[words.length - 1]);

  if (cleaned.includes("banana")) add("banana");
  if (cleaned.includes("chicken") && cleaned.includes("breast")) add("chicken breast");
  if (cleaned.includes("kumara")) add("sweet potato");

  return variants.slice(0, 8);
}

export function scoreNameMatch(query: string, candidate: string): number {
  const q = query.toLowerCase().trim();
  const c = candidate.toLowerCase().trim();
  if (c === q) return 100;
  if (c.includes(q) || q.includes(c)) {
    let score = 80;
    if (isCompoundProduct(c) && q.split(/\s+/).length <= 2) score -= 50;
    return score;
  }

  const qWords = q.split(/\s+/).filter((w) => w.length > 2);
  const cWords = c.split(/\s+/).filter((w) => w.length > 2);
  let score = 0;
  for (const w of qWords) {
    if (cWords.some((cw) => cw.includes(w) || w.includes(cw))) score += 15;
  }
  if (score > 0 && isCompoundProduct(c) && qWords.length <= 2) score -= 40;
  return score;
}

/** Reject smoothies, mixes, and multi-ingredient products for simple lookups. */
export function isCompoundProduct(name: string): boolean {
  const n = name.toLowerCase();
  if (/\b(&| and | with | plus | smoothie|mix|blend|salad|medley|combo|assorted|variety pack)\b/.test(n)) {
    return true;
  }
  const foodHits = n.match(
    /\b(banana|apple|orange|strawberr|berry|berries|grape|mango|peach|pear|kiwi|melon|chicken|beef|pork|fish|salmon|rice|pasta|potato|carrot|onion|tomato)\b/g,
  );
  return (foodHits?.length ?? 0) > 2;
}

export function isStrongMatch(query: string, candidate: string): boolean {
  return scoreNameMatch(query, candidate) >= 45;
}

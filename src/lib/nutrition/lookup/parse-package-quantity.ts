/** Parse OFF `quantity` strings like "420 g", "1 L", "6 x 330 ml". */
export function parsePackageQuantity(raw: string | undefined | null): {
  size: number | null;
  unit: string;
} {
  if (!raw?.trim()) return { size: null, unit: "g" };

  const text = raw.trim().toLowerCase();

  const multi = text.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(g|kg|ml|l|cl|litre|liter|each)?/i);
  if (multi) {
    const count = Number(multi[1]);
    const each = Number(multi[2]);
    const unit = normalizePackageUnit(multi[3] ?? "g");
    if (count > 0 && each > 0) {
      return { size: count * each, unit };
    }
  }

  const single = text.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|cl|litre|liter|each)?/i);
  if (single) {
    const size = Number(single[1]);
    const unit = normalizePackageUnit(single[2] ?? "g");
    if (size > 0) return { size, unit };
  }

  return { size: null, unit: "g" };
}

function normalizePackageUnit(raw: string): string {
  const u = raw.toLowerCase();
  if (u === "kg") return "g";
  if (u === "l" || u === "litre" || u === "liter") return "ml";
  if (u === "cl") return "ml";
  if (u === "each") return "each";
  return u || "g";
}

/** Convert parsed package to grams for canonical storage when mass-based. */
export function packageSizeToGrams(size: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u === "kg") return Math.round(size * 1000);
  if (u === "l" || u === "litre" || u === "liter") return Math.round(size * 1000);
  if (u === "cl") return Math.round(size * 10);
  return Math.round(size);
}

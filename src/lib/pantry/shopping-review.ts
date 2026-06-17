/** Parse quantities like "500g", "1.5 kg", "2 each" from display strings. */
export function parseDisplayQuantity(display: string): { quantity: number; unit: string } | null {
  const m = display.trim().match(/^([\d.]+)\s*([a-zA-Z]+)/);
  if (!m) return null;
  const quantity = Number(m[1]);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  return { quantity, unit: m[2].toLowerCase() };
}

export function buildShoppingReviewItems(
  items: {
    ingredientId: number;
    ingredientName: string;
    packages: number;
    packageSize?: number;
    packageUnit?: string;
    neededDisplay?: string;
  }[],
) {
  return items.map((item) => {
    const parsed = item.neededDisplay ? parseDisplayQuantity(item.neededDisplay) : null;
    const packageSize = item.packageSize ?? 100;
    const unit = item.packageUnit ?? parsed?.unit ?? "g";
    const quantity = parsed?.quantity ?? item.packages * packageSize;

    return {
      ingredientId: item.ingredientId,
      name: item.ingredientName,
      quantity,
      unit,
    };
  });
}

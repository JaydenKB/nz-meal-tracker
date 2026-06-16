import type { ShoppingListGroup } from "@/lib/shopping/buildList";

export type PricedShoppingItem = {
  ingredientId: number;
  ingredientName: string;
  productName: string;
  packages: number;
  neededDisplay: string;
  unitPrice: number | null;
  lineCost: number | null;
  noPrice: boolean;
};

export type PricedShoppingGroup = {
  storeName: string;
  storeTotal: number | null;
  items: PricedShoppingItem[];
  isUnlinked: boolean;
};

export type ShoppingCostSummary = {
  groups: PricedShoppingGroup[];
  grandTotal: number | null;
  pricedItemCount: number;
  totalItemCount: number;
  unpricedItems: string[];
};

export function buildShoppingCostSummary(
  shoppingList: ShoppingListGroup[],
  productRows: {
    ingredientId: number;
    productName: string;
    storeId: number;
    priceNzd: number | null;
  }[],
): ShoppingCostSummary {
  let grandTotal = 0;
  let hasAnyPrice = false;
  let pricedItemCount = 0;
  let totalItemCount = 0;
  const unpricedItems: string[] = [];

  const groups: PricedShoppingGroup[] = shoppingList.map((group) => {
    let storeTotal = 0;
    let storeHasPrice = false;

    const items: PricedShoppingItem[] = group.items.map((item) => {
      totalItemCount++;
      const isUnlinked = !group.store;

      if (isUnlinked || item.packages === 0) {
        unpricedItems.push(item.ingredientName);
        return {
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          productName: item.productName,
          packages: item.packages,
          neededDisplay: item.neededDisplay,
          unitPrice: null,
          lineCost: null,
          noPrice: true,
        };
      }

      const product = productRows.find(
        (p) =>
          p.ingredientId === item.ingredientId &&
          p.productName === item.productName &&
          p.storeId === group.store!.id,
      );

      if (!product?.priceNzd) {
        unpricedItems.push(item.ingredientName);
        return {
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          productName: item.productName,
          packages: item.packages,
          neededDisplay: item.neededDisplay,
          unitPrice: null,
          lineCost: null,
          noPrice: true,
        };
      }

      const lineCost = Math.round(product.priceNzd * item.packages * 100) / 100;
      storeTotal += lineCost;
      storeHasPrice = true;
      hasAnyPrice = true;
      pricedItemCount++;

      return {
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        productName: item.productName,
        packages: item.packages,
        neededDisplay: item.neededDisplay,
        unitPrice: product.priceNzd,
        lineCost,
        noPrice: false,
      };
    });

    if (storeHasPrice) grandTotal += storeTotal;

    return {
      storeName: group.store?.name ?? "Needs store link",
      storeTotal: storeHasPrice ? Math.round(storeTotal * 100) / 100 : null,
      items,
      isUnlinked: !group.store,
    };
  });

  return {
    groups,
    grandTotal: hasAnyPrice ? Math.round(grandTotal * 100) / 100 : null,
    pricedItemCount,
    totalItemCount,
    unpricedItems,
  };
}

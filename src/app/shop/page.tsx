import { ShopTabClient } from "@/components/shop/shop-tab";
import { getBatchWithShoppingList, getLatestBatch } from "@/lib/queries";

export const dynamic = "force-dynamic";

function parsePackageDisplay(display: string): { packageSize: number; packageUnit: string } {
  const match = display.match(/^([\d.]+)\s+(\S+)$/);
  if (match) {
    return { packageSize: Number(match[1]), packageUnit: match[2] };
  }
  return { packageSize: 1, packageUnit: "g" };
}

export default async function ShopPage() {
  const latest = await getLatestBatch();

  if (!latest) {
    return (
      <ShopTabClient
        recipeName={null}
        batchLabel={null}
        batchId={null}
        groups={[]}
        owned={[]}
        skippedCount={0}
        grandTotal={null}
      />
    );
  }

  const data = await getBatchWithShoppingList(latest.id);
  if (!data) {
    return (
      <ShopTabClient
        recipeName={null}
        batchLabel={null}
        batchId={null}
        groups={[]}
        owned={[]}
        skippedCount={0}
        grandTotal={null}
      />
    );
  }

  const packageMap = new Map<string, { packageSize: number; packageUnit: string }>();
  for (const group of data.shoppingList) {
    for (const item of group.items) {
      packageMap.set(
        `${item.ingredientId}-${item.productName}`,
        parsePackageDisplay(item.packageDisplay),
      );
    }
  }

  const groups = data.costSummary.groups.map((g) => ({
    storeName: g.storeName,
    isUnlinked: g.isUnlinked,
    storeTotal: g.storeTotal,
    items: g.items.map((item) => {
      const pkg = packageMap.get(`${item.ingredientId}-${item.productName}`) ?? {
        packageSize: 1,
        packageUnit: "g",
      };
      return {
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        productName: item.productName,
        packages: item.packages,
        lineCost: item.lineCost,
        packageSize: pkg.packageSize,
        packageUnit: pkg.packageUnit,
      };
    }),
  }));

  return (
    <ShopTabClient
      recipeName={data.recipe.name}
      batchLabel={`${data.batch.multiplier}× batch`}
      batchId={data.batch.id}
      groups={groups}
      owned={data.pantryOwned}
      skippedCount={data.pantrySkippedCount}
      grandTotal={data.costSummary.grandTotal}
    />
  );
}

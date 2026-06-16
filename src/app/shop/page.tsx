import { ShopTabClient } from "@/components/shop/shop-tab";
import { getBatchWithShoppingList, getLatestBatch } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const latest = await getLatestBatch();

  if (!latest) {
    return (
      <ShopTabClient batchLabel={null} batchId={null} groups={[]} grandTotal={null} />
    );
  }

  const data = await getBatchWithShoppingList(latest.id);
  if (!data) {
    return (
      <ShopTabClient batchLabel={null} batchId={null} groups={[]} grandTotal={null} />
    );
  }

  const groups = data.costSummary.groups.map((g) => ({
    storeName: g.storeName,
    isUnlinked: g.isUnlinked,
    storeTotal: g.storeTotal,
    items: g.items.map((item) => ({
      ingredientName: item.ingredientName,
      productName: item.productName,
      packages: item.packages,
      lineCost: item.lineCost,
    })),
  }));

  return (
    <ShopTabClient
      batchLabel={`${data.batch.multiplier}× batch`}
      batchId={data.batch.id}
      groups={groups}
      grandTotal={data.costSummary.grandTotal}
    />
  );
}

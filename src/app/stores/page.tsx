import { StoresPageClient } from "@/components/stores/stores-page-client";
import { getAllIngredients, getAllStores, getStoreProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const [allStores, allIngredients, productRows] = await Promise.all([
    getAllStores(),
    getAllIngredients(),
    getStoreProducts(),
  ]);

  const products = productRows.map((row) => ({
    id: row.store_products.id,
    productName: row.store_products.productName,
    priceNzd: row.store_products.priceNzd,
    ingredientName: row.ingredients.name,
    storeName: row.stores.name,
  }));

  return (
    <StoresPageClient
      allStores={allStores}
      allIngredients={allIngredients.map((i) => ({ id: i.id, name: i.name }))}
      products={products}
    />
  );
}

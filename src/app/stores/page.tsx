import {
  createStore,
  createStoreProduct,
  deleteStore,
  deleteStoreProduct,
} from "@/app/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SUPPORTED_UNITS } from "@/lib/nutrition/units";
import { getAllIngredients, getAllStores, getStoreProducts } from "@/lib/queries";

export default async function StoresPage() {
  const [allStores, allIngredients, products] = await Promise.all([
    getAllStores(),
    getAllIngredients(),
    getStoreProducts(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stores"
        subtitle="Link ingredients to Auckland products"
      />

      <Card>
        <CardHeader>
          <CardTitle>Add store</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createStore} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store name</Label>
              <Input id="storeName" name="name" required placeholder="Woolworths Mt Eden" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeNotes">Notes</Label>
              <Input id="storeNotes" name="notes" placeholder="Aisle 3" />
            </div>
            <Button type="submit" className="w-full">Add store</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Link product</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createStoreProduct} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeId">Store</Label>
              <Select id="storeId" name="storeId" required defaultValue="">
                <option value="" disabled>Select store</option>
                {allStores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ingredientId">Ingredient</Label>
              <Select id="ingredientId" name="ingredientId" required defaultValue="">
                <option value="" disabled>Select ingredient</option>
                {allIngredients.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="productName">Product name</Label>
              <Input id="productName" name="productName" required placeholder="Chicken Breast 500g" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="packageSize">Package size</Label>
                <Input id="packageSize" name="packageSize" type="number" step="0.1" required defaultValue={500} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="packageUnit">Unit</Label>
                <Select id="packageUnit" name="packageUnit" defaultValue="g">
                  {SUPPORTED_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceNzd">Price NZD</Label>
              <Input id="priceNzd" name="priceNzd" type="number" step="0.01" placeholder="12.50" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input id="isPreferred" name="isPreferred" type="checkbox" className="h-4 w-4 rounded" defaultChecked />
              Preferred product
            </label>
            <div className="space-y-2">
              <Label htmlFor="productNotes">Notes</Label>
              <Input id="productNotes" name="notes" placeholder="Sold by bunch" />
            </div>
            <Button type="submit" className="w-full">Add product link</Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-2.5">
        <h2 className="text-base font-semibold">Your stores</h2>
        {allStores.map((store) => (
          <div
            key={store.id}
            className="flex items-start justify-between rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-3.5"
          >
            <div>
              <p className="font-semibold">{store.name}</p>
              {store.notes && <p className="text-sm text-[var(--muted)]">{store.notes}</p>}
            </div>
            <form action={deleteStore.bind(null, store.id)}>
              <Button type="submit" variant="ghost" size="sm">Delete</Button>
            </form>
          </div>
        ))}
      </section>

      <section className="space-y-2.5">
        <h2 className="text-base font-semibold">Product links</h2>
        {products.length === 0 ? (
          <p className="rounded-[var(--radius-lg)] bg-[var(--beige)] px-4 py-6 text-center text-sm text-[var(--muted)]">
            No product links yet.
          </p>
        ) : (
          products.map((row) => (
            <div
              key={row.store_products.id}
              className="flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-3.5"
            >
              <div>
                <p className="font-semibold">{row.store_products.productName}</p>
                <p className="text-sm text-[var(--muted)]">
                  {row.ingredients.name} · {row.stores.name}
                  {row.store_products.priceNzd ? ` · $${row.store_products.priceNzd}` : ""}
                </p>
              </div>
              <form action={deleteStoreProduct.bind(null, row.store_products.id)}>
                <Button type="submit" variant="ghost" size="sm">Delete</Button>
              </form>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

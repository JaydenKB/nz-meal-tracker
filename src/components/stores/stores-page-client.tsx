"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft } from "lucide-react";
import {
  archiveStore,
  createStore,
  createStoreProduct,
  deleteStore,
  deleteStoreProduct,
} from "@/app/actions";
import { DeleteGuardDialog } from "@/components/integrity/delete-guard-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { SUPPORTED_UNITS } from "@/lib/nutrition/units";

type Store = { id: number; name: string; notes: string | null };
type Ingredient = { id: number; name: string };
type ProductRow = {
  id: number;
  productName: string;
  priceNzd: number | null;
  ingredientName: string;
  storeName: string;
};

export function StoresPageClient({
  allStores,
  allIngredients,
  products,
}: {
  allStores: Store[];
  allIngredients: Ingredient[];
  products: ProductRow[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [guard, setGuard] = useState<{
    storeId: number;
    storeName: string;
    items: { label: string; detail?: string }[];
  } | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleCreateStore(formData: FormData) {
    await createStore(formData);
    refresh();
  }

  async function handleCreateProduct(formData: FormData) {
    await createStoreProduct(formData);
    refresh();
  }

  async function handleDeleteStore(id: number, name: string) {
    const res = await fetch(`/api/integrity/store/${id}`);
    if (!res.ok) {
      await deleteStore(id);
      refresh();
      return;
    }
    const deps = await res.json();
    if (deps.productCount > 0) {
      setGuard({
        storeId: id,
        storeName: name,
        items: [{ label: `${deps.productCount} store product link${deps.productCount === 1 ? "" : "s"}` }],
      });
      return;
    }
    if (!confirm(`Delete ${name}?`)) return;
    setDeletingId(id);
    try {
      await deleteStore(id);
      refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteProduct(id: number) {
    setDeletingId(id);
    try {
      await deleteStoreProduct(id);
      refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-4">
      <header className="flex items-center gap-3">
        <Link
          href="/shop"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-[1.75rem] font-medium">Stores</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Add store</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleCreateStore} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store name</Label>
              <Input id="storeName" name="name" required placeholder="Woolworths Mt Eden" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeNotes">Notes</Label>
              <Input id="storeNotes" name="notes" placeholder="Aisle 3" />
            </div>
            <SubmitButton className="w-full">Add store</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Link product</CardTitle>
        </CardHeader>
        <CardContent>
          {allStores.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Add a store above first.</p>
          ) : allIngredients.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Add ingredients first in{" "}
              <Link href="/ingredients" className="font-medium text-[var(--primary)]">
                Ingredients
              </Link>
              .
            </p>
          ) : (
            <form action={handleCreateProduct} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeId">Store</Label>
                <Select id="storeId" name="storeId" required defaultValue={String(allStores[0].id)}>
                  {allStores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ingredientId">Ingredient</Label>
                <Select id="ingredientId" name="ingredientId" required defaultValue={String(allIngredients[0].id)}>
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
              <label className="flex min-h-[44px] items-center gap-2 text-sm">
                <input id="isPreferred" name="isPreferred" type="checkbox" className="h-5 w-5 rounded" defaultChecked />
                Preferred product
              </label>
              <div className="space-y-2">
                <Label htmlFor="productNotes">Notes</Label>
                <Input id="productNotes" name="notes" placeholder="Sold by bunch" />
              </div>
              <SubmitButton className="w-full">Add product link</SubmitButton>
            </form>
          )}
        </CardContent>
      </Card>

      <section className="space-y-2.5">
        <h2 className="text-base font-semibold">Your stores</h2>
        {allStores.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No stores yet.</p>
        ) : (
          allStores.map((store) => (
            <div
              key={store.id}
              className="flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-3.5"
            >
              <div>
                <p className="font-semibold">{store.name}</p>
                {store.notes && <p className="text-sm text-[var(--muted)]">{store.notes}</p>}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={deletingId === store.id}
                onClick={() => handleDeleteStore(store.id, store.name)}
                className="min-h-[44px] min-w-[44px]"
              >
                {deletingId === store.id ? "…" : "Delete"}
              </Button>
            </div>
          ))
        )}
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
              key={row.id}
              className="flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-3.5"
            >
              <div>
                <p className="font-semibold">{row.productName}</p>
                <p className="text-sm text-[var(--muted)]">
                  {row.ingredientName} · {row.storeName}
                  {row.priceNzd != null ? ` · $${row.priceNzd}` : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={deletingId === row.id}
                onClick={() => handleDeleteProduct(row.id)}
                className="min-h-[44px] min-w-[44px]"
              >
                {deletingId === row.id ? "…" : "Delete"}
              </Button>
            </div>
          ))
        )}
      </section>

      <DeleteGuardDialog
        open={guard != null}
        title={guard ? `Delete ${guard.storeName}?` : ""}
        subtitle="This store is linked to products. Deleting it would affect them."
        items={guard?.items ?? []}
        onArchive={async () => {
          if (!guard) return;
          setDeletingId(guard.storeId);
          await archiveStore(guard.storeId);
          setGuard(null);
          setDeletingId(null);
          refresh();
        }}
        onDeleteAnyway={async () => {
          if (!guard) return;
          setDeletingId(guard.storeId);
          await deleteStore(guard.storeId);
          setGuard(null);
          setDeletingId(null);
          refresh();
        }}
        onClose={() => setGuard(null)}
        busy={deletingId != null}
      />
    </div>
  );
}

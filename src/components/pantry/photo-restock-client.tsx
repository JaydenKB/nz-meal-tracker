"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Check,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiLoader, type ScanChipStatus } from "@/components/ui/ai-loader";
import type { RestockReviewItem } from "@/lib/import/photo-restock-types";
import { play } from "@/lib/sfx";

type UploadImage = {
  id: string;
  preview: string;
  base64: string;
  selected: boolean;
};

type IngredientOption = { id: number; name: string };

const BUCKET_META = {
  matched: {
    label: "Matched",
    dotClass: "bg-[var(--success)]",
    hint: "",
  },
  not_sure: {
    label: "Not sure",
    dotClass: "bg-[#e8b86d]",
    hint: " · tap to confirm",
  },
  new: {
    label: "New",
    dotClass: "bg-[var(--streak)]",
    hint: " · not in library",
  },
} as const;

export function PhotoRestockClient() {
  const router = useRouter();
  const [images, setImages] = useState<UploadImage[]>([]);
  const [items, setItems] = useState<RestockReviewItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<{
    current: number;
    total: number;
    completedImages: number;
    itemsFound: number;
    chipStatuses: ScanChipStatus[];
    activePreview?: string;
  } | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [ingredientOptions, setIngredientOptions] = useState<IngredientOption[]>([]);
  const [primaryPhoto, setPrimaryPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ingredients-list")
      .then((r) => r.json())
      .then((data) => setIngredientOptions(data.ingredients ?? []))
      .catch(() => {});
  }, []);

  const selectedImages = images.filter((i) => i.selected);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const isImage =
        file.type.startsWith("image/") ||
        /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(file.name);
      if (!isImage) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setImages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            preview: result,
            base64: result,
            selected: true,
          },
        ]);
      };
      reader.onerror = () => setError(`Could not read ${file.name}. Try another image.`);
      reader.readAsDataURL(file);
    });
  }, []);

  async function scanOnePhoto(
    img: UploadImage,
    photoIndex: number,
  ): Promise<{ items: RestockReviewItem[]; error?: string }> {
    const res = await fetch("/api/pantry/photo-restock/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: img.base64, photoIndex }),
    });
    const data = await res.json();
    if (!res.ok) return { items: [], error: data.error ?? "Scan failed" };
    return { items: data.items ?? [] };
  }

  async function handleScan() {
    if (selectedImages.length === 0) return;
    setLoading(true);
    setError(null);
    setItems(null);

    const total = selectedImages.length;
    const chipStatuses: ScanChipStatus[] = Array(total).fill("queued");
    let accumulated: RestockReviewItem[] = [];

    setPrimaryPhoto(selectedImages[0]?.preview ?? null);
    setScanProgress({
      current: 1,
      total,
      completedImages: 0,
      itemsFound: 0,
      chipStatuses: [...chipStatuses],
      activePreview: selectedImages[0]?.preview,
    });

    for (let i = 0; i < total; i++) {
      const img = selectedImages[i];
      chipStatuses[i] = "active";
      setScanProgress({
        current: i + 1,
        total,
        completedImages: i,
        itemsFound: accumulated.length,
        chipStatuses: [...chipStatuses],
        activePreview: img.preview,
      });

      const result = await scanOnePhoto(img, i);
      if (result.error) {
        chipStatuses[i] = "failed";
        setError(result.error);
      } else {
        chipStatuses[i] = "done";
        accumulated = [...accumulated, ...result.items];
      }

      setScanProgress({
        current: Math.min(i + 2, total),
        total,
        completedImages: i + 1,
        itemsFound: accumulated.length,
        chipStatuses: [...chipStatuses],
        activePreview: selectedImages[i + 1]?.preview,
      });
    }

    setScanProgress(null);
    setLoading(false);

    if (accumulated.length > 0) {
      setItems(accumulated);
    } else if (!error) {
      setError("No items detected — try a clearer photo or check your AI settings.");
    }
  }

  function updateItem(id: string, patch: Partial<RestockReviewItem>) {
    setItems((prev) =>
      (prev ?? []).map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function confirmBestGuess(id: string) {
    setItems((prev) =>
      (prev ?? []).map((item) => {
        if (item.id !== id || !item.bestGuessId) return item;
        return {
          ...item,
          bucket: "matched" as const,
          ingredientId: item.bestGuessId,
          ingredientName: item.bestGuessName,
          confirmed: true,
        };
      }),
    );
  }

  function openPicker(id: string) {
    setPickerFor(id);
    setPickerQuery("");
  }

  function pickIngredient(ingredient: IngredientOption) {
    if (!pickerFor) return;
    updateItem(pickerFor, {
      bucket: "matched",
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      confirmed: true,
    });
    setPickerFor(null);
  }

  const activeItems = useMemo(
    () => (items ?? []).filter((i) => !i.removed),
    [items],
  );

  const grouped = useMemo(() => {
    const buckets = { matched: [] as RestockReviewItem[], not_sure: [] as RestockReviewItem[], new: [] as RestockReviewItem[] };
    for (const item of activeItems) {
      buckets[item.bucket].push(item);
    }
    return buckets;
  }, [activeItems]);

  const confirmedCount = useMemo(
    () =>
      activeItems.filter(
        (i) =>
          i.confirmed &&
          i.ingredientId != null &&
          i.quantity != null &&
          i.quantity > 0,
      ).length,
    [activeItems],
  );

  const filteredPicker = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return ingredientOptions.slice(0, 40);
    return ingredientOptions.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 40);
  }, [pickerQuery, ingredientOptions]);

  async function handleAddToPantry() {
    const toAdd = activeItems.filter(
      (i) =>
        i.confirmed &&
        i.ingredientId != null &&
        i.quantity != null &&
        i.quantity > 0,
    );

    if (toAdd.length === 0) {
      setError("Select at least one item with a quantity to add.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/pantry/photo-restock/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: toAdd.map((i) => ({
            clientId: i.id,
            ingredientId: i.ingredientId,
            quantity: i.quantity,
            unit: i.unit,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add to pantry");

      if (data.warnings?.length) {
        const ids = new Set(data.warnings.map((w: { clientId?: string }) => w.clientId));
        setItems((prev) =>
          (prev ?? []).map((item) =>
            ids.has(item.id)
              ? {
                  ...item,
                  conversionWarning:
                    data.warnings.find((w: { clientId?: string }) => w.clientId === item.id)
                      ?.reason ?? "Conversion failed",
                }
              : item,
          ),
        );
      }

      const addedIds = new Set(
        toAdd
          .filter((i) => !data.warnings?.some((w: { clientId?: string }) => w.clientId === i.id))
          .map((i) => i.id),
      );

      setItems((prev) =>
        (prev ?? []).map((item) =>
          addedIds.has(item.id) ? { ...item, removed: true, confirmed: false } : item,
        ),
      );

      if (data.added > 0) {
        play("log");
      }

      const remaining = activeItems.filter((i) => !addedIds.has(i.id));
      if (remaining.length === 0) {
        router.push("/shop/pantry");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add to pantry");
    } finally {
      setSaving(false);
    }
  }

  const showReview = items != null && activeItems.length > 0;

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-28">
      <div className="flex items-center gap-3">
        <Link
          href="/shop/pantry"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white"
          aria-label="Back to pantry"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium">Photo restock</h1>
          <p className="text-sm text-[var(--muted)]">Snap groceries → review → pantry</p>
        </div>
      </div>

      {!showReview && (
        <>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)] bg-[var(--beige)]/50 px-6 py-10 transition hover:border-[var(--primary)]/40">
            <Camera className="h-10 w-10 text-[var(--primary)]" strokeWidth={1.5} />
            <span className="text-sm font-medium">Take or upload grocery photos</span>
            <span className="text-xs text-[var(--muted)]">One photo with multiple items works best</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </label>

          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() =>
                    setImages((prev) =>
                      prev.map((i) =>
                        i.id === img.id ? { ...i, selected: !i.selected } : i,
                      ),
                    )
                  }
                  className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 ${
                    img.selected ? "border-[var(--primary)]" : "border-transparent opacity-50"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {scanProgress && (
            <AiLoader
              variant="ocr"
              current={scanProgress.current}
              total={scanProgress.total}
              completedImages={scanProgress.completedImages}
              itemsFound={scanProgress.itemsFound}
              chipStatuses={scanProgress.chipStatuses}
              activePreview={scanProgress.activePreview}
              subtitle="Identifying grocery items"
            />
          )}

          {selectedImages.length > 0 && !loading && (
            <Button className="w-full" onClick={() => void handleScan()} disabled={loading}>
              Detect items ({selectedImages.length} photo{selectedImages.length === 1 ? "" : "s"})
            </Button>
          )}
        </>
      )}

      {showReview && (
        <>
          {primaryPhoto && (
            <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={primaryPhoto} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                <p className="text-sm font-medium text-white">
                  your photo · {activeItems.length} item{activeItems.length === 1 ? "" : "s"} found
                </p>
              </div>
            </div>
          )}

          {(["matched", "not_sure", "new"] as const).map((bucket) => {
            const list = grouped[bucket];
            if (list.length === 0) return null;
            const meta = BUCKET_META[bucket];
            return (
              <section key={bucket} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} aria-hidden />
                  <h2 className="text-sm font-semibold">
                    {meta.label} · {list.length}
                    {meta.hint}
                  </h2>
                </div>
                <div className="space-y-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-2">
                  {list.map((item) => (
                    <RestockRow
                      key={item.id}
                      item={item}
                      onUpdate={(patch) => updateItem(item.id, patch)}
                      onConfirmGuess={() => confirmBestGuess(item.id)}
                      onPickOther={() => openPicker(item.id)}
                      onRemove={() => updateItem(item.id, { removed: true })}
                      onScanCreate={() =>
                        router.push(
                          `/shop/pantry/restock/create?name=${encodeURIComponent(item.detectedName)}`,
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })}

          <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-white p-4">
            <div className="mx-auto max-w-[430px]">
              <Button
                className="w-full"
                disabled={saving || confirmedCount === 0}
                onClick={() => void handleAddToPantry()}
              >
                {saving
                  ? "Adding…"
                  : `Add ${confirmedCount} confirmed to pantry`}
              </Button>
            </div>
          </div>
        </>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {pickerFor && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-[430px] rounded-t-[var(--radius-lg)] bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium">Pick ingredient</h3>
              <button type="button" onClick={() => setPickerFor(null)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                placeholder="Search library…"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {filteredPicker.map((ing) => (
                <button
                  key={ing.id}
                  type="button"
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[var(--beige)]"
                  onClick={() => pickIngredient(ing)}
                >
                  {ing.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RestockRow({
  item,
  onUpdate,
  onConfirmGuess,
  onPickOther,
  onRemove,
  onScanCreate,
}: {
  item: RestockReviewItem;
  onUpdate: (patch: Partial<RestockReviewItem>) => void;
  onConfirmGuess: () => void;
  onPickOther: () => void;
  onRemove: () => void;
  onScanCreate: () => void;
}) {
  const displayName = item.ingredientName ?? item.detectedName;

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)]/60 p-3">
      <div className="flex items-start gap-3">
        {item.bucket === "matched" && (
          <button
            type="button"
            onClick={() => onUpdate({ confirmed: !item.confirmed })}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
              item.confirmed
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border)] bg-white"
            }`}
            aria-label={item.confirmed ? "Deselect" : "Select"}
          >
            {item.confirmed && <Check className="h-3 w-3" strokeWidth={3} />}
          </button>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{displayName}</p>
              {item.bucket === "matched" && item.ingredientName && item.detectedName !== item.ingredientName && (
                <p className="text-xs text-[var(--muted)]">detected: {item.detectedName}</p>
              )}
              {item.bucket === "not_sure" && item.bestGuessName && (
                <p className="text-xs text-[var(--muted)]">best guess: {item.bestGuessName}</p>
              )}
              {item.bucket === "new" && (
                <p className="text-xs text-[var(--muted)]">no match — scan label to add</p>
              )}
            </div>
            <button type="button" onClick={onRemove} className="text-[var(--muted)]" aria-label="Remove">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {item.bucket === "matched" && item.confirmed && (
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                step="any"
                value={item.quantity ?? ""}
                onChange={(e) =>
                  onUpdate({
                    quantity: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="Qty"
                className="h-9 flex-1"
              />
              <Input
                value={item.unit}
                onChange={(e) => onUpdate({ unit: e.target.value })}
                placeholder="Unit"
                className="h-9 w-20"
              />
            </div>
          )}

          {item.conversionWarning && (
            <p className="text-xs text-[#b45309]">{item.conversionWarning}</p>
          )}

          {item.bucket === "not_sure" && (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={onConfirmGuess}>
                Yes{item.bestGuessName ? `, ${item.bestGuessName.split(" ")[0].toLowerCase()}` : ""}
              </Button>
              <Button size="sm" variant="secondary" className="flex-1" onClick={onPickOther}>
                Pick other
              </Button>
            </div>
          )}

          {item.bucket === "new" && (
            <Button
              size="sm"
              variant="ai"
              className="w-full bg-[var(--ai)] hover:bg-[var(--ai)]/90"
              onClick={onScanCreate}
            >
              Scan label to create
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

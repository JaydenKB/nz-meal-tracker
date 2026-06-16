"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  Cpu,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { nutrientsSummary } from "@/lib/nutrition/nutrients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DetectedItem, FailedScan } from "@/lib/import/types";
import { recalcDetectedItem } from "@/lib/import/types";
import { AiLoader, type ScanChipStatus } from "@/components/ui/ai-loader";

type StoreOption = { id: number; name: string };

type UploadImage = {
  id: string;
  preview: string;
  base64: string;
  selected: boolean;
};

const statInputClass =
  "h-10 rounded-xl border border-[var(--border)] bg-[var(--beige)] px-2 text-center text-sm focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30";

function StatField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly,
  suffix,
  warning,
}: {
  label: string;
  value: string | number;
  onChange?: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  readOnly?: boolean;
  suffix?: string;
  warning?: boolean;
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-[var(--muted)]">{label}</p>
      {readOnly ? (
        <div className="rounded-xl bg-[var(--beige)] px-2 py-2 text-center text-sm font-medium">
          {value || "—"}
        </div>
      ) : (
        <div className="relative">
          <Input
            type={type}
            step={type === "number" ? "any" : undefined}
            min={type === "number" ? 0 : undefined}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className={`${statInputClass}${warning ? " border-[#e8b86d] bg-white" : ""}${suffix ? " pr-7" : ""}`}
          />
          {suffix && (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">
              {suffix}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function ImportPageClient({
  initialStores = [],
}: {
  initialStores?: StoreOption[];
}) {
  const router = useRouter();
  const [stores, setStores] = useState<StoreOption[]>(initialStores);
  const [storeId, setStoreId] = useState<number | null>(initialStores[0]?.id ?? null);
  const [images, setImages] = useState<UploadImage[]>([]);
  const [items, setItems] = useState<DetectedItem[] | null>(null);
  const [failedScans, setFailedScans] = useState<FailedScan[]>([]);
  const [visionModel, setVisionModel] = useState("qwen2.5vl:3b");
  const [scanLocal, setScanLocal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState<{
    current: number;
    total: number;
    completedImages: number;
    itemsFound: number;
    chipStatuses: ScanChipStatus[];
    activePreview?: string;
  } | null>(null);
  const [retryingScanId, setRetryingScanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStores(initialStores);
    if (initialStores.length > 0) {
      setStoreId((current) =>
        current != null && initialStores.some((s) => s.id === current)
          ? current
          : initialStores[0].id,
      );
    }
  }, [initialStores]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((settings) => {
        if (settings.aiProvider === "openai") {
          setVisionModel(settings.openaiVisionModel ?? "gpt-4o");
          setScanLocal(false);
        } else if (settings.ollamaVisionModel) {
          setVisionModel(settings.ollamaVisionModel);
          setScanLocal(true);
        }
      })
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
      reader.onerror = () => {
        setError(`Could not read ${file.name}. Try another image.`);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const toggleImage = (id: string) => {
    setImages((imgs) =>
      imgs.map((img) => (img.id === id ? { ...img, selected: !img.selected } : img)),
    );
  };

  async function scanOneImage(
    img: UploadImage,
    imageIndex: number,
    imageTotal: number,
    idOffset: number,
  ): Promise<{ items: DetectedItem[]; error?: string }> {
    const res = await fetch("/api/ingredients/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        image: img.base64,
        imageIndex,
        imageTotal,
        idOffset,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { items: [], error: data.error ?? "Scan failed" };
    }
    if (data.visionModel) setVisionModel(data.visionModel);
    if (typeof data.local === "boolean") setScanLocal(data.local);
    return { items: data.items ?? [] };
  }

  async function handleScan() {
    if (!storeId || selectedImages.length === 0) return;
    setLoading(true);
    setError(null);
    setFailedScans([]);

    const total = selectedImages.length;
    const chipStatuses: ScanChipStatus[] = Array(total).fill("queued");
    let accumulated: DetectedItem[] = [];
    let idOffset = 0;
    const failures: FailedScan[] = [];

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

      try {
        const result = await scanOneImage(img, i + 1, total, idOffset);
        if (result.error) {
          chipStatuses[i] = "failed";
          failures.push({
            uploadId: img.id,
            imageIndex: i + 1,
            preview: img.preview,
            error: result.error,
          });
        } else {
          chipStatuses[i] = "done";
          accumulated = [...accumulated, ...result.items];
          idOffset += result.items.length;
        }
      } catch (e) {
        chipStatuses[i] = "failed";
        failures.push({
          uploadId: img.id,
          imageIndex: i + 1,
          preview: img.preview,
          error: e instanceof Error ? e.message : "Scan failed",
        });
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
    setFailedScans(failures);

    if (accumulated.length > 0 || failures.length > 0) {
      setItems(accumulated);
    }

    if (accumulated.length === 0 && failures.length > 0) {
      setError("No items could be read — retry failed images below.");
    } else if (accumulated.length === 0) {
      setError("No products detected — try a clearer screenshot or check your AI settings.");
    } else if (failures.length > 0) {
      setError(null);
    }
  }

  async function retryFailedScan(failed: FailedScan) {
    if (!storeId) return;
    const img = images.find((i) => i.id === failed.uploadId);
    if (!img) return;

    setRetryingScanId(failed.uploadId);
    setError(null);

    try {
      const idOffset = items?.length ?? 0;
      const result = await scanOneImage(img, failed.imageIndex, selectedImages.length, idOffset);

      if (result.error) {
        setError(`Image ${failed.imageIndex} couldn't be read — ${result.error}`);
        return;
      }

      setItems((prev) => [...(prev ?? []), ...result.items]);
      setFailedScans((prev) => prev.filter((f) => f.uploadId !== failed.uploadId));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : `Image ${failed.imageIndex} couldn't be read`,
      );
    } finally {
      setRetryingScanId(null);
    }
  }

  function updateItem(id: string, patch: Partial<DetectedItem>) {
    setItems((prev) =>
      (prev ?? []).map((item) => {
        if (item.id !== id) return item;
        const merged = { ...item, ...patch, packageUnit: "g" as const };
        if (patch.priceNzd != null) {
          merged.priceUnclear = false;
        }
        return recalcDetectedItem(merged);
      }),
    );
  }

  function toggleItem(id: string) {
    setItems((prev) =>
      (prev ?? []).map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item,
      ),
    );
  }

  async function refillFromDatabase(id: string, name: string) {
    if (!name.trim()) return;
    try {
      const res = await fetch(
        `/api/ingredients/lookup?q=${encodeURIComponent(name.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      updateItem(id, {
        calories: data.calories,
        proteinG: data.proteinG,
        fatG: data.fatG,
        carbsG: data.carbsG,
        nutrients: data.nutrients,
        nutritionSource: data.source,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Database lookup failed");
    }
  }

  async function handleSave() {
    if (!storeId || !items) return;
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ingredients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, items: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.push("/ingredients");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  const selectedCount = items?.filter((i) => i.selected).length ?? 0;

  if (items) {
    return (
      <div className="space-y-5 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setItems(null); setFailedScans([]); setError(null); }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--foreground)]"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <div>
            <h1 className="text-[1.65rem] font-bold leading-tight">Review detected items</h1>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              {items.length} found · check before saving
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-[var(--radius-lg)] bg-[var(--orange-soft)] px-4 py-3 text-sm text-[#c47a2c]">
            {error}
          </p>
        )}

        {failedScans.length > 0 && (
          <div className="space-y-2 rounded-[var(--radius-lg)] border border-[#e8b86d] bg-[var(--orange-soft)] p-4">
            <p className="text-sm font-medium text-[#c47a2c]">
              {failedScans.length} screenshot{failedScans.length === 1 ? "" : "s"} couldn&apos;t be read
            </p>
            {failedScans.map((failed) => (
              <button
                key={failed.uploadId}
                type="button"
                disabled={retryingScanId === failed.uploadId}
                onClick={() => retryFailedScan(failed)}
                className="flex w-full items-center gap-3 rounded-xl bg-white/80 px-3 py-2 text-left text-sm transition-colors hover:bg-white disabled:opacity-60"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={failed.preview} alt="" className="h-full w-full object-cover opacity-70" />
                </div>
                <span>
                  Image {failed.imageIndex} couldn&apos;t be read —{" "}
                  {retryingScanId === failed.uploadId ? "retrying…" : "tap to retry"}
                </span>
              </button>
            ))}
          </div>
        )}

        {items.length === 0 && failedScans.length > 0 ? (
          <Button
            className="w-full"
            onClick={() => {
              setItems(null);
              setFailedScans([]);
              setError(null);
            }}
          >
            ← Back to upload
          </Button>
        ) : (
          <>
        <div className="space-y-3">
          {items.map((item) => {
            const hasWarning = Boolean(item.warning);
            return (
              <div
                key={item.id}
                className={`relative rounded-[var(--radius-lg)] border p-4 ${
                  hasWarning
                    ? "border-[#e8b86d] bg-[var(--orange-soft)]"
                    : "border-[var(--border)] bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded border ${
                    item.selected
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--border)] bg-white"
                  }`}
                  aria-label={item.selected ? "Deselect item" : "Select item"}
                >
                  {item.selected && <Check className="h-3 w-3" strokeWidth={3} />}
                </button>

                <div className="flex gap-2 pr-8">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
                    className="h-10 flex-1 border-transparent bg-[var(--beige)] font-semibold focus-visible:bg-white"
                    aria-label="Product name"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0 px-2"
                    onClick={() => refillFromDatabase(item.id, item.name)}
                    aria-label="Refill from database"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>

                {hasWarning && (
                  <p className="mt-1 text-sm text-[#c47a2c]">{item.warning}</p>
                )}

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <StatField
                    label="Size (g)"
                    type="number"
                    value={item.packageSize || ""}
                    suffix="g"
                    onChange={(v) =>
                      updateItem(item.id, { packageSize: v ? Number(v) : 0 })
                    }
                  />
                  <StatField
                    label="Price"
                    type="number"
                    placeholder="?"
                    value={item.priceNzd ?? ""}
                    warning={hasWarning}
                    onChange={(v) =>
                      updateItem(item.id, {
                        priceNzd: v ? Number(v) : null,
                        priceUnclear: !v,
                      })
                    }
                  />
                  <StatField
                    label="$/100g"
                    readOnly
                    value={
                      item.pricePer100g != null
                        ? `$${item.pricePer100g.toFixed(2)}`
                        : "—"
                    }
                  />
                </div>

                <p className="mb-2 mt-3 text-xs font-medium text-[var(--muted)]">
                  Nutrition per 100g
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <StatField
                    label="kcal"
                    type="number"
                    value={item.calories || ""}
                    onChange={(v) =>
                      updateItem(item.id, { calories: v ? Number(v) : 0 })
                    }
                  />
                  <StatField
                    label="Protein"
                    type="number"
                    value={item.proteinG || ""}
                    suffix="g"
                    onChange={(v) =>
                      updateItem(item.id, { proteinG: v ? Number(v) : 0 })
                    }
                  />
                  <StatField
                    label="Fat"
                    type="number"
                    value={item.fatG || ""}
                    suffix="g"
                    onChange={(v) =>
                      updateItem(item.id, { fatG: v ? Number(v) : 0 })
                    }
                  />
                  <StatField
                    label="Carbs"
                    type="number"
                    value={item.carbsG || ""}
                    suffix="g"
                    onChange={(v) =>
                      updateItem(item.id, { carbsG: v ? Number(v) : 0 })
                    }
                  />
                </div>

                {item.nutritionSource && (
                  <p className="mt-2 text-xs text-[var(--primary)]">
                    Nutrition:{" "}
                    {item.nutritionSource === "reference"
                      ? "reference (common foods)"
                      : item.nutritionSource}
                    {item.nutrients
                      ? ` · ${nutrientsSummary(item.nutrients)}`
                      : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <Button size="lg" className="w-full" disabled={saving || selectedCount === 0} onClick={handleSave}>
          {saving ? "Saving…" : `Save ${selectedCount} item${selectedCount === 1 ? "" : "s"} to library`}
        </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-3">
        <Link
          href="/ingredients"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--foreground)]"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[1.65rem] font-bold leading-tight">Import from screenshot</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">Snap a store page, we fill the rest</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center text-[var(--primary)]">
          <Camera className="h-6 w-6" strokeWidth={1.75} />
        </div>
      </div>

      <section className="space-y-2">
        <p className="text-sm font-semibold">Store</p>
        {stores.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--beige)] px-4 py-4 text-sm text-[var(--muted)]">
            <p>No stores yet.</p>
            <Link href="/stores" className="mt-2 inline-block font-medium text-[var(--primary)]">
              Add a store →
            </Link>
          </div>
        ) : (
          <div className="relative">
            <select
              value={storeId ?? stores[0].id}
              onChange={(e) => setStoreId(Number(e.target.value))}
              className="h-12 w-full cursor-pointer appearance-none rounded-[var(--radius-lg)] border border-[var(--border)] bg-white px-4 pr-10 text-sm font-medium text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          </div>
        )}
      </section>

      <section>
        <input
          id="screenshot-upload"
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <label
          htmlFor="screenshot-upload"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          className="flex min-h-[140px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-[#d4d0c8] bg-white px-6 py-10 text-center active:bg-[var(--beige)]"
        >
          <Camera className="h-8 w-8 text-[var(--muted)]" strokeWidth={1.5} />
          <span className="text-sm text-[var(--muted)]">Drop screenshots or tap to upload</span>
        </label>

        {images.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => toggleImage(img.id)}
                className={`relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl border-2 touch-manipulation ${
                  img.selected
                    ? "border-[var(--primary)] bg-[var(--mint)]"
                    : "border-dashed border-[var(--border)] bg-[var(--beige)] opacity-60"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt="" className="h-full w-full object-cover" />
                {img.selected && (
                  <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            ))}
            <label
              htmlFor="screenshot-upload"
              className="flex h-[72px] w-[72px] shrink-0 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--beige)] active:opacity-80"
              aria-label="Add screenshot"
            >
              <Camera className="h-5 w-5 text-[var(--muted)]" />
            </label>
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-[var(--radius-lg)] bg-[var(--orange-soft)] px-4 py-3 text-sm text-[#c47a2c]">
          {error}
        </p>
      )}

      {loading && scanProgress && (
        <AiLoader
          variant="ocr"
          current={scanProgress.current}
          total={scanProgress.total}
          completedImages={scanProgress.completedImages}
          itemsFound={scanProgress.itemsFound}
          chipStatuses={scanProgress.chipStatuses}
          activePreview={scanProgress.activePreview}
        />
      )}

      <Button
        size="lg"
        className="w-full"
        disabled={loading || !storeId || selectedImages.length === 0}
        onClick={handleScan}
      >
        <ScanLine className="h-5 w-5" />
        {loading
          ? "Scanning…"
          : !storeId
            ? "Select a store first"
            : selectedImages.length === 0
              ? "Upload screenshots to scan"
              : `Scan ${selectedImages.length} screenshot${selectedImages.length === 1 ? "" : "s"}`}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--muted)]">
        <Cpu className="h-3.5 w-3.5" />
        {visionModel} · {scanLocal ? "runs locally" : "OpenAI cloud"}
      </p>
    </div>
  );
}

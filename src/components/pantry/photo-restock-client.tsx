"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiLoader, type ScanChipStatus } from "@/components/ui/ai-loader";
import type { RestockReviewItem } from "@/lib/import/photo-restock-types";
import {
  appendPantryReviewLines,
  restockItemToReviewLine,
} from "@/lib/pantry/review-session";

type UploadImage = {
  id: string;
  preview: string;
  base64: string;
  selected: boolean;
};

export function PhotoRestockClient() {
  const router = useRouter();
  const [images, setImages] = useState<UploadImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<{
    current: number;
    total: number;
    completedImages: number;
    itemsFound: number;
    chipStatuses: ScanChipStatus[];
    activePreview?: string;
  } | null>(null);

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

    const total = selectedImages.length;
    const chipStatuses: ScanChipStatus[] = Array(total).fill("queued");
    let accumulated: RestockReviewItem[] = [];

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
      appendPantryReviewLines(accumulated.map(restockItemToReviewLine));
      router.push("/shop/pantry/review");
    } else if (!error) {
      setError("No items detected — try a clearer photo or check your AI settings.");
    }
  }

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-28">
      <div className="flex items-center gap-3">
        <Link
          href="/shop/pantry/add"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium">Photo of your haul</h1>
          <p className="text-sm text-[var(--muted)]">Items go to the shared review screen</p>
        </div>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)] bg-[var(--beige)]/50 px-6 py-10">
        <Camera className="h-10 w-10 text-[var(--primary)]" strokeWidth={1.5} />
        <span className="text-sm font-medium">Take or upload grocery photos</span>
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
                  prev.map((i) => (i.id === img.id ? { ...i, selected: !i.selected } : i)),
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

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

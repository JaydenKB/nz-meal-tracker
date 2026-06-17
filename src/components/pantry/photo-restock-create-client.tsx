"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiLoader } from "@/components/ui/ai-loader";
import type { DetectedItem } from "@/lib/import/types";
import {
  appendPantryReviewLines,
  libraryItemToReviewLine,
} from "@/lib/pantry/review-session";
import { play } from "@/lib/sfx";

const statInputClass =
  "h-10 rounded-xl border border-[var(--border)] bg-[var(--beige)] px-2 text-center text-sm focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30";

function StatField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange?: (v: string) => void;
  type?: "text" | "number";
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-[var(--muted)]">{label}</p>
      <Input
        type={type}
        step={type === "number" ? "any" : undefined}
        min={type === "number" ? 0 : undefined}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={statInputClass}
      />
    </div>
  );
}

type LabelImage = { preview: string; base64: string } | null;

export function PhotoRestockCreateClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hintName = searchParams.get("name") ?? "";
  const seedBarcode = searchParams.get("barcode") ?? "";
  const hub = searchParams.get("hub") === "1";

  const [front, setFront] = useState<LabelImage>(null);
  const [back, setBack] = useState<LabelImage>(null);
  const [draft, setDraft] = useState<DetectedItem | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImage = useCallback((file: File, setter: (img: LabelImage) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setter({ preview: result, base64: result });
    };
    reader.onerror = () => setError(`Could not read ${file.name}`);
    reader.readAsDataURL(file);
  }, []);

  async function handleScan() {
    if (!front && !back) {
      setError("Capture at least the back label (nutrition panel).");
      return;
    }
    setScanning(true);
    setError(null);

    try {
      const res = await fetch("/api/pantry/photo-restock/label-scan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontImage: front?.base64,
          backImage: back?.base64,
          hintName: hintName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Label scan failed");
      setDraft(data.item);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Label scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function handleSave() {
    if (!draft?.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/pantry/photo-restock/label-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          calories: draft.calories,
          proteinG: draft.proteinG,
          fatG: draft.fatG,
          carbsG: draft.carbsG,
          packageSize: draft.packageSize,
          isProcessed: draft.isProcessed,
          pantryQuantity: draft.packageSize,
          pantryUnit: "g",
          barcode: seedBarcode || undefined,
          addToPantry: !hub,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      if (hub && data.ingredientId) {
        appendPantryReviewLines([
          libraryItemToReviewLine({
            ingredientId: data.ingredientId,
            name: draft.name,
            quantity: draft.packageSize,
            unit: "g",
            source: "label",
          }),
        ]);
      }

      play("log");
      router.push(hub ? "/shop/pantry/review" : "/shop/pantry");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
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
          <h1 className="text-xl font-medium">New ingredient</h1>
          <p className="text-sm text-[var(--muted)]">
            {hintName ? `${hintName} · scan both sides` : "Scan front + back label"}
            {seedBarcode ? ` · barcode ${seedBarcode.slice(0, 10)}…` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CaptureSlot
          label="Front"
          image={front}
          onFile={(f) => loadImage(f, setFront)}
          variant="teal"
        />
        <CaptureSlot
          label="Back (label)"
          image={back}
          onFile={(f) => loadImage(f, setBack)}
          variant="beige"
          dashed
        />
      </div>
      <p className="text-center text-xs text-[var(--muted)]">
        Back label gives the nutrition panel
      </p>

      {scanning && (
        <AiLoader variant="ocr" current={1} total={1} completedImages={0} itemsFound={0} subtitle="Reading nutrition label" />
      )}

      {!draft && !scanning && (front || back) && (
        <Button className="w-full" onClick={() => void handleScan()}>
          Read labels
        </Button>
      )}

      {draft && (
        <>
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              AI filled in
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <StatField
                  label="Name"
                  value={draft.name}
                  onChange={(v) => setDraft({ ...draft, name: v })}
                />
              </div>
              <StatField
                label="Per 100g"
                value={draft.calories}
                type="number"
                onChange={(v) => setDraft({ ...draft, calories: Number(v) })}
              />
              <StatField
                label="Protein"
                value={draft.proteinG}
                type="number"
                onChange={(v) => setDraft({ ...draft, proteinG: Number(v) })}
              />
              <StatField
                label="Fat"
                value={draft.fatG}
                type="number"
                onChange={(v) => setDraft({ ...draft, fatG: Number(v) })}
              />
              <StatField
                label="Carbs"
                value={draft.carbsG}
                type="number"
                onChange={(v) => setDraft({ ...draft, carbsG: Number(v) })}
              />
              <StatField
                label="Size"
                value={draft.packageSize}
                type="number"
                onChange={(v) => setDraft({ ...draft, packageSize: Number(v) })}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-[#e8b86d]/40 bg-[#fef3e2] px-4 py-3 text-sm text-[#92400e]">
            <span aria-hidden>⚠</span>
            <span>Check values against the label before saving.</span>
          </div>

          <Button className="w-full" disabled={saving} onClick={() => void handleSave()}>
            {saving ? "Saving…" : "Create & add to pantry"}
          </Button>
        </>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function CaptureSlot({
  label,
  image,
  onFile,
  variant,
  dashed,
}: {
  label: string;
  image: LabelImage;
  onFile: (f: File) => void;
  variant: "teal" | "beige";
  dashed?: boolean;
}) {
  const bg = variant === "teal" ? "bg-[var(--mint)]" : "bg-[var(--beige)]";
  return (
    <label
      className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] ${bg} ${
        dashed ? "border-2 border-dashed border-[var(--border)]" : ""
      }`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.preview} alt="" className="h-full w-full rounded-[var(--radius-lg)] object-cover" />
      ) : (
        <>
          <Camera className="h-8 w-8 text-[var(--primary)]" strokeWidth={1.5} />
          <span className="text-xs font-medium">{label}</span>
        </>
      )}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}

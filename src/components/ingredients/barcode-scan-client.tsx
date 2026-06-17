"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import type { BarcodeDraft, BarcodeLookupResponse } from "@/lib/import/barcode-types";
import {
  appendPantryReviewLines,
  barcodeToReviewLine,
} from "@/lib/pantry/review-session";
import { play } from "@/lib/sfx";

type Step = "scan" | "result" | "not_found" | "offline" | "edit";

const statInputClass =
  "h-10 rounded-xl border border-[var(--border)] bg-[var(--beige)] px-2 text-center text-sm focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30";

export function BarcodeScanClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPantry = searchParams.get("from") === "pantry";
  const useHub = searchParams.get("hub") === "1" || fromPantry;
  const backHref = useHub ? "/shop/pantry/add" : "/ingredients";

  const [step, setStep] = useState<Step>("scan");
  const [manualCode, setManualCode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [barcode, setBarcode] = useState("");
  const [draft, setDraft] = useState<BarcodeDraft | null>(null);
  const [localIngredientId, setLocalIngredientId] = useState<number | null>(null);
  const [localName, setLocalName] = useState("");
  const [packageCount, setPackageCount] = useState(1);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const lookup = useCallback(async (code: string) => {
    setLookupLoading(true);
    setLookupError(null);
    setBarcode(code);

    try {
      const res = await fetch(`/api/ingredients/barcode?code=${encodeURIComponent(code)}`);
      const data = (await res.json()) as BarcodeLookupResponse & { error?: string };

      if (!res.ok && data.error) {
        throw new Error(data.error);
      }

      if (data.status === "offline") {
        setStep("offline");
        setLookupError(data.message);
        return;
      }

      if (data.status === "local") {
        setLocalIngredientId(data.ingredient.id);
        setLocalName(data.ingredient.name);
        setDraft({
          barcode: code,
          name: data.ingredient.name,
          packageSize: null,
          packageUnit: "g",
          calories: data.ingredient.calories,
          proteinG: data.ingredient.proteinG,
          fatG: data.ingredient.fatG,
          carbsG: data.ingredient.carbsG,
          isProcessed: true,
          nutritionSource: "openfoodfacts",
          missingFields: [],
        });
        setStep("result");
        return;
      }

      if (data.status === "not_found") {
        setStep("not_found");
        return;
      }

      if (data.status === "found" || data.status === "partial") {
        setDraft(data.draft);
        setStep("result");
        return;
      }
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  }, []);

  const onDetected = useCallback(
    (code: string) => {
      void lookup(code);
    },
    [lookup],
  );

  const { videoRef, start, active, cameraError } = useBarcodeScanner(onDetected);

  useEffect(() => {
    void start();
    return () => {};
  }, [start]);

  async function handleManualLookup() {
    const code = manualCode.replace(/\D/g, "");
    if (code.length < 7) {
      setLookupError("Enter at least 7 digits");
      return;
    }
    await lookup(code);
  }

  async function handleAddToReview() {
    if (!draft) return;
    setSaving(true);
    setLookupError(null);

    try {
      let ingredientId = localIngredientId;
      if (!ingredientId) {
        const res = await fetch("/api/ingredients/barcode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barcode,
            name: draft.name,
            calories: draft.calories ?? 0,
            proteinG: draft.proteinG ?? 0,
            fatG: draft.fatG ?? 0,
            carbsG: draft.carbsG ?? 0,
            packageSize: draft.packageSize ?? 100,
            packageUnit: draft.packageUnit,
            isProcessed: draft.isProcessed,
            packageCount,
            addToPantry: false,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        ingredientId = data.ingredientId;
      }

      const qty = packageCount * (draft.packageSize ?? 100);
      appendPantryReviewLines([
        barcodeToReviewLine({
          ingredientId: ingredientId!,
          name: draft.name,
          quantity: qty,
          unit: draft.packageUnit,
          barcode,
        }),
      ]);
      router.push("/shop/pantry/review");
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!draft) return;

    if (useHub) {
      await handleAddToReview();
      return;
    }

    if (localIngredientId && !fromPantry) {
      router.push(`/ingredients/${localIngredientId}`);
      return;
    }

    setSaving(true);
    setLookupError(null);

    try {
      const res = await fetch("/api/ingredients/barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode,
          name: draft.name,
          brand: draft.brand,
          calories: draft.calories ?? 0,
          proteinG: draft.proteinG ?? 0,
          fatG: draft.fatG ?? 0,
          carbsG: draft.carbsG ?? 0,
          packageSize: draft.packageSize ?? 100,
          packageUnit: draft.packageUnit,
          isProcessed: draft.isProcessed,
          packageCount,
          addToPantry: fromPantry || localIngredientId != null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      play("log");
      router.push(backHref);
      router.refresh();
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function resetScan() {
    setStep("scan");
    setDraft(null);
    setLocalIngredientId(null);
    setManualCode("");
    setLookupError(null);
    void start();
  }

  const packageLabel =
    draft?.packageSize && draft.packageSize > 0
      ? `${packageCount} × ${draft.packageSize}g`
      : `${packageCount} package${packageCount === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto max-w-[430px] min-h-[100dvh]">
      {step === "scan" && (
        <div className="flex min-h-[100dvh] flex-col bg-[#1a1f1e] text-white">
          <header className="flex items-center gap-3 px-4 py-4">
            <Link
              href={backHref}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="flex-1 text-center text-lg font-medium">Scan barcode</h1>
            <div className="w-10" />
          </header>

          <div className="relative mx-4 flex-1 overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
              aria-label="Camera preview"
            />
            {!active && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white/80">
                {lookupLoading ? "Looking up…" : "Starting camera…"}
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-44 w-56">
                <span className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-[var(--mint)]" />
                <span className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-[var(--mint)]" />
                <span className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-[var(--mint)]" />
                <span className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-[var(--mint)]" />
                <div className="barcode-scan-line absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-[var(--mint)] shadow-[0_0_12px_var(--mint)]" />
              </div>
            </div>
          </div>

          <p className="py-4 text-center text-sm text-white/70">Point at the barcode</p>

          {(cameraError || lookupError) && (
            <p className="mx-4 mb-2 text-center text-sm text-[#fbbf24]">
              {cameraError ?? lookupError}
            </p>
          )}

          <div className="space-y-3 px-4 pb-8">
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                placeholder="Enter barcode manually"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
              />
              <Button
                variant="secondary"
                disabled={lookupLoading}
                onClick={() => void handleManualLookup()}
                className="shrink-0"
              >
                Look up
              </Button>
            </div>
            <Button
              variant="secondary"
              className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20"
              onClick={() => {
                setManualCode("");
                setLookupError(null);
              }}
            >
              No camera? Enter barcode manually
            </Button>
            <p className="text-center text-[10px] text-white/40">
              Looks up Open Food Facts online (opt-in external lookup)
            </p>
          </div>
        </div>
      )}

      {step === "offline" && (
        <OfflineState
          backHref={backHref}
          message={lookupError ?? "Offline"}
          barcode={barcode}
          onRetry={() => void lookup(barcode)}
          onManual={() => setStep("scan")}
        />
      )}

      {step === "not_found" && (
        <NotFoundState
          backHref={backHref}
          barcode={barcode}
          fromPantry={fromPantry}
          onRetry={resetScan}
        />
      )}

      {step === "result" && draft && (
        <div className="space-y-5 bg-[var(--background)] px-4 pb-28 pt-4">
          <header className="flex items-center gap-3">
            <button type="button" onClick={resetScan} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-medium">Found it</h1>
          </header>

          <div className="flex items-center gap-2 rounded-xl border border-[var(--success)]/30 bg-[var(--green-soft)] px-4 py-3 text-sm font-medium text-[var(--primary)]">
            <Check className="h-4 w-4 shrink-0" />
            {localIngredientId
              ? "Already in your library"
              : "Matched in Open Food Facts"}
          </div>

          <div className="flex gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
            {draft.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.imageUrl}
                alt=""
                className="h-20 w-20 shrink-0 rounded-xl border border-[var(--border)] object-contain bg-white"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[var(--beige)]">
                <ScanLine className="h-8 w-8 text-[var(--muted)]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {editMode ? (
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="font-medium"
                />
              ) : (
                <p className="font-semibold leading-snug">{draft.name}</p>
              )}
              <p className="mt-1 text-sm text-[var(--muted)]">
                {draft.packageSize ? `${draft.packageSize}g` : "Size unknown"}
                {" · "}barcode {barcode.slice(0, 10)}…
              </p>
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Nutrition · per 100g
            </p>
            <NutritionRow label="Energy" value={draft.calories} suffix=" kcal" editMode={editMode} onChange={(v) => setDraft({ ...draft, calories: v })} />
            <NutritionRow label="Protein" value={draft.proteinG} suffix="g" editMode={editMode} onChange={(v) => setDraft({ ...draft, proteinG: v })} warning={draft.missingFields.includes("protein")} />
            <NutritionRow label="Fat" value={draft.fatG} suffix="g" editMode={editMode} onChange={(v) => setDraft({ ...draft, fatG: v })} warning={draft.missingFields.includes("fat")} />
            <NutritionRow label="Carbs" value={draft.carbsG} suffix="g" editMode={editMode} onChange={(v) => setDraft({ ...draft, carbsG: v })} warning={draft.missingFields.includes("carbs")} />
          </div>

          {draft.missingFields.length > 0 && !localIngredientId && (
            <p className="text-sm text-[#b45309]">
              Missing: {draft.missingFields.join(", ")} — fill in or use label scan.
            </p>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-[#e8b86d]/40 bg-[#fef3e2] px-4 py-3 text-sm text-[#92400e]">
            <span aria-hidden>ℹ</span>
            <span>Community data — give it a quick check</span>
          </div>

          <div className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-4 py-3">
            <span className="text-sm font-medium">Add to pantry</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)]"
                onClick={() => setPackageCount((c) => Math.max(1, c - 1))}
                aria-label="Decrease packages"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[5rem] text-center text-sm tabular-nums">{packageLabel}</span>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)]"
                onClick={() => setPackageCount((c) => c + 1)}
                aria-label="Increase packages"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {lookupError && (
            <p className="text-sm text-red-600">{lookupError}</p>
          )}

          <div className="fixed inset-x-0 bottom-0 z-50 space-y-2 border-t border-[var(--border)] bg-white p-4">
            <div className="mx-auto max-w-[430px] space-y-2">
              <Button className="w-full" disabled={saving} onClick={() => void handleSave()}>
                {saving
                  ? "Adding…"
                  : useHub
                    ? "Add to review"
                    : fromPantry || localIngredientId
                      ? "Save ingredient & add to pantry"
                      : "Save ingredient"}
              </Button>
              {!editMode && (
                <Button variant="secondary" className="w-full" onClick={() => setEditMode(true)}>
                  Edit details first
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function NutritionRow({
  label,
  value,
  suffix,
  editMode,
  onChange,
  warning,
}: {
  label: string;
  value: number | null;
  suffix: string;
  editMode: boolean;
  onChange: (v: number | null) => void;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)]/60 py-2.5 last:border-0">
      <span className={`text-sm ${warning ? "text-[#b45309]" : "text-[var(--foreground)]"}`}>
        {label}
        {warning ? " · missing" : ""}
      </span>
      {editMode ? (
        <Input
          type="number"
          step="any"
          className={`${statInputClass} w-24`}
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : null)
          }
        />
      ) : (
        <span className="text-sm font-medium tabular-nums">
          {value != null ? `${value}${suffix}` : "—"}
        </span>
      )}
    </div>
  );
}

function NotFoundState({
  backHref,
  barcode,
  fromPantry,
  onRetry,
}: {
  backHref: string;
  barcode: string;
  fromPantry: boolean;
  onRetry: () => void;
}) {
  const labelHref = `/shop/pantry/restock/create?barcode=${encodeURIComponent(barcode)}${fromPantry ? "" : ""}`;

  return (
    <div className="mx-auto max-w-[430px] space-y-5 px-4 py-8">
      <header className="flex items-center gap-3">
        <Link href={backHref} className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-medium">Not in the database</h1>
      </header>

      <p className="text-sm text-[var(--muted)]">
        Barcode <span className="font-mono">{barcode}</span> isn&apos;t in Open Food Facts yet — common for NZ store brands. Scan the label once and it&apos;ll be saved locally for next time.
      </p>

      <Link href={labelHref}>
        <Button variant="ai" className="w-full">
          Scan label to create
        </Button>
      </Link>
      <Link href="/ingredients">
        <Button variant="secondary" className="w-full">
          Add manually
        </Button>
      </Link>
      <Button variant="secondary" className="w-full" onClick={onRetry}>
        Try another barcode
      </Button>
    </div>
  );
}

function OfflineState({
  backHref,
  message,
  barcode,
  onRetry,
  onManual,
}: {
  backHref: string;
  message: string;
  barcode: string;
  onRetry: () => void;
  onManual: () => void;
}) {
  return (
    <div className="mx-auto max-w-[430px] space-y-5 px-4 py-8">
      <header className="flex items-center gap-3">
        <Link href={backHref} className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-medium">Offline</h1>
      </header>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      {barcode && (
        <Button className="w-full" onClick={onRetry}>
          Retry lookup
        </Button>
      )}
      <Button variant="secondary" className="w-full" onClick={onManual}>
        Enter barcode manually
      </Button>
    </div>
  );
}

import type { PantryItemSource } from "@/lib/pantry/review-session";
import { sourceLabel } from "@/lib/pantry/review-session";

const CHIP_STYLES: Record<PantryItemSource, string> = {
  barcode: "bg-[var(--ai-soft)] text-[var(--ai)]",
  photo: "bg-[var(--green-soft)] text-[var(--primary)]",
  label: "bg-[#fef3e2] text-[#92400e]",
  library: "bg-[var(--beige)] text-[var(--muted)]",
  shopping: "bg-[var(--blue-soft)] text-[#2d6a9f]",
};

export function PantrySourceChip({ source }: { source: PantryItemSource }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CHIP_STYLES[source]}`}
    >
      {sourceLabel(source)}
    </span>
  );
}

export function PantrySourceSummary({ counts }: { counts: Partial<Record<PantryItemSource, number>> }) {
  const entries = (Object.entries(counts) as [PantryItemSource, number][]).filter(([, n]) => n > 0);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([source, n]) => (
        <span
          key={source}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${CHIP_STYLES[source]}`}
        >
          {n} {sourceLabel(source)}
        </span>
      ))}
    </div>
  );
}

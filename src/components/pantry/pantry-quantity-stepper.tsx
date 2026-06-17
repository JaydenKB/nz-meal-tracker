import { Minus, Plus } from "lucide-react";

export function PantryQuantityStepper({
  label,
  packageCount,
  packageSize,
  unit,
  onChange,
}: {
  label?: string;
  packageCount: number;
  packageSize: number | null;
  unit: string;
  onChange: (count: number) => void;
}) {
  const display =
    packageSize != null && packageSize > 0
      ? `${packageCount} × ${packageSize}${unit}`
      : `${packageCount} pkg`;

  return (
    <div className="flex items-center justify-between gap-3">
      {label && <span className="text-sm font-medium">{label}</span>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)]"
          onClick={() => onChange(Math.max(1, packageCount - 1))}
          aria-label="Decrease"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[5rem] text-center text-sm tabular-nums">{display}</span>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)]"
          onClick={() => onChange(packageCount + 1)}
          aria-label="Increase"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

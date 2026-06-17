"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DeleteGuardItem = {
  label: string;
  detail?: string;
  expandable?: boolean;
};

export function DeleteGuardDialog({
  open,
  title,
  subtitle,
  items,
  archiveLabel = "Archive instead",
  onArchive,
  onDeleteAnyway,
  onClose,
  busy,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  items: DeleteGuardItem[];
  archiveLabel?: string;
  onArchive: () => void;
  onDeleteAnyway: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-[430px] rounded-t-[var(--radius-lg)] bg-white p-5 sm:rounded-[var(--radius-lg)]">
        <div className="mb-4 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#fef3e2]">
            <Trash2 className="h-7 w-7 text-[#c47a2c]" />
          </div>
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
        </div>

        <ul className="mb-4 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--beige)] px-4 py-3 text-sm">
          {items.map((item) => (
            <li key={item.label} className="flex justify-between gap-2">
              <span>{item.label}</span>
              {item.detail && (
                <span className="text-[var(--muted)]">{item.detail}</span>
              )}
            </li>
          ))}
        </ul>

        <div className="mb-4 rounded-xl border border-[var(--ai)]/20 bg-[var(--ai-soft)] px-4 py-3 text-sm">
          <strong>Tip: archive instead</strong> — hides it from lists but keeps recipes and logs
          intact.
        </div>

        <div className="space-y-2">
          <Button className="w-full" variant="outline" disabled={busy} onClick={onArchive}>
            {archiveLabel}
          </Button>
          <Button
            className="w-full border-red-200 text-red-700"
            variant="outline"
            disabled={busy}
            onClick={onDeleteAnyway}
          >
            Delete anyway
          </Button>
          <Button className="w-full" variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

import { Check, Eye, Sparkles, X } from "lucide-react";

export type ScanChipStatus = "queued" | "active" | "done" | "failed";

type AiLoaderProps =
  | {
      variant: "ocr";
      /** 1-based index of the image currently being scanned */
      current: number;
      total: number;
      /** Images fully processed (success or failed) */
      completedImages: number;
      itemsFound: number;
      chipStatuses?: ScanChipStatus[];
      activePreview?: string;
    }
  | {
      variant: "elaborate";
    };

export function AiLoader(props: AiLoaderProps) {
  if (props.variant === "elaborate") {
    return (
      <div
        className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--ai)]/20 bg-[var(--ai-soft)] px-4 py-6"
        role="status"
        aria-live="polite"
        aria-label="Explaining this step"
      >
        <div className="ai-elaborate-shimmer pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative flex items-center justify-center gap-2 text-sm font-medium text-[var(--ai)]">
          <Sparkles className="h-4 w-4 animate-pulse" />
          Explaining this step…
        </div>
      </div>
    );
  }

  const {
    current,
    total,
    completedImages,
    itemsFound,
    chipStatuses,
    activePreview,
  } = props;

  const progress = total > 0 ? completedImages / total : 0;
  const headline =
    total === 1 ? "Scanning screenshot" : `Scanning image ${current} of ${total}`;

  const showChips = total <= 8 && chipStatuses && chipStatuses.length === total;

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-sm"
      role="status"
      aria-live="polite"
      aria-label={headline}
    >
      <div className="flex gap-4">
        {activePreview && (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--beige)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePreview}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="ocr-scan-beam pointer-events-none absolute inset-0" aria-hidden />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-semibold leading-snug">{headline}</p>
            <p className="mt-0.5 text-sm text-[var(--muted)]">Reading prices &amp; sizes</p>
          </div>

          <div className="space-y-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-[var(--beige)]">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300 ease-out"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            {total > 1 && (
              <p className="text-xs text-[var(--muted)]">
                {completedImages} of {total} complete
              </p>
            )}
          </div>

          <p className="text-sm text-[var(--primary)]">
            {itemsFound} item{itemsFound === 1 ? "" : "s"} found so far
          </p>
        </div>
      </div>

      {showChips ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {chipStatuses!.map((status, i) => (
            <ScanChip key={i} index={i + 1} status={status} />
          ))}
        </div>
      ) : total > 1 ? (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Image {current} of {total}
        </p>
      ) : null}
    </div>
  );
}

function ScanChip({ index, status }: { index: number; status: ScanChipStatus }) {
  const base =
    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors";

  if (status === "done") {
    return (
      <div
        className={`${base} bg-[var(--mint)] text-[var(--primary)]`}
        aria-label={`Image ${index} done`}
      >
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </div>
    );
  }

  if (status === "active") {
    return (
      <div
        className={`${base} bg-[var(--primary)] text-white ring-2 ring-[var(--mint)]`}
        aria-label={`Image ${index} scanning`}
      >
        <Eye className="h-4 w-4" />
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div
        className={`${base} bg-[var(--orange-soft)] text-[#c47a2c]`}
        aria-label={`Image ${index} failed`}
      >
        <X className="h-4 w-4" strokeWidth={2.5} />
      </div>
    );
  }

  return (
    <div
      className={`${base} bg-[var(--beige)] text-[var(--muted)]`}
      aria-label={`Image ${index} queued`}
    >
      {index}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type LogActionButtonProps = {
  onLog: () => Promise<boolean>;
  className?: string;
  size?: "sm" | "md";
  label?: string;
  disabled?: boolean;
};

export function LogActionButton({
  onLog,
  className,
  size = "md",
  label = "Log this meal",
  disabled,
}: LogActionButtonProps) {
  const [phase, setPhase] = useState<"idle" | "confirm" | "busy">("idle");
  const [ripple, setRipple] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (phase !== "idle" || disabled) return;

    setPhase("busy");
    setRipple(true);
    window.setTimeout(() => setRipple(false), 450);

    const ok = await onLog();
    if (!ok) {
      setPhase("idle");
      return;
    }

    setPhase("confirm");
    window.setTimeout(() => setPhase("idle"), 900);
  }

  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || phase === "busy"}
      aria-label={phase === "confirm" ? "Logged" : label}
      className={cn(
        "pressable relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)] text-white shadow-[var(--shadow-sm)] disabled:opacity-60",
        dim,
        phase === "confirm" && "log-pop",
        className,
      )}
    >
      {ripple && (
        <span className="log-ripple pointer-events-none absolute inset-0 rounded-full bg-white/30" />
      )}
      {phase === "confirm" ? (
        <Check className={cn(iconSize, "check-pop")} strokeWidth={2.5} />
      ) : (
        <Plus className={iconSize} strokeWidth={2.5} />
      )}
    </button>
  );
}

/** Inline text confirmation shown beside log buttons */
export function LogConfirmText({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="check-pop text-xs font-medium text-[var(--success)]">
      ✓ Logged
    </span>
  );
}

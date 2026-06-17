"use client";

import { cn } from "@/lib/utils";

type ToggleSwitchProps = {
  checked: boolean;
  onChange: () => void;
  label?: string;
  className?: string;
};

export function ToggleSwitch({
  checked,
  onChange,
  label,
  className,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      data-on={checked ? "true" : "false"}
      className={cn(
        "toggle-track pressable relative h-7 w-12 shrink-0 rounded-full",
        checked ? "bg-[var(--primary)]" : "bg-[var(--beige)]",
        className,
      )}
    >
      <span className="toggle-knob absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-[var(--surface-elevated)]" />
    </button>
  );
}

import { cn } from "@/lib/utils";

type PillProps = {
  children: React.ReactNode;
  active?: boolean;
  variant?: "default" | "ai" | "goal";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export function Pill({
  children,
  active,
  variant = "default",
  className,
  onClick,
  disabled,
}: PillProps) {
  const base =
    "pressable inline-flex items-center justify-center rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium transition-colors";

  const styles = {
    default: active
      ? "bg-[var(--primary)] text-white [background-image:var(--primary-gradient)]"
      : "bg-[var(--beige)] text-[var(--foreground)]",
    ai: active
      ? "bg-[var(--ai)] text-white"
      : "bg-[var(--ai-soft)] text-[var(--ai)]",
    goal: active
      ? "bg-[var(--ai-soft)] text-[var(--ai)] ring-2 ring-[var(--ai)]/30"
      : "bg-[var(--beige)] text-[var(--muted)]",
  };

  if (onClick) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(base, styles[variant], disabled && "opacity-40", className)}
      >
        {children}
      </button>
    );
  }

  return <span className={cn(base, styles[variant], className)}>{children}</span>;
}

import Link from "next/link";
import { Settings } from "lucide-react";

type TabHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
};

export function TabHeader({ title, subtitle, backHref, backLabel, action }: TabHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        {backHref && (
          <Link
            href={backHref}
            className="pressable mb-1 inline-block text-sm font-medium text-[var(--primary)]"
          >
            ← {backLabel ?? "Back"}
          </Link>
        )}
        <h1 className="text-[var(--text-display)] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm font-normal text-[var(--muted)]">{subtitle}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        <Link
          href="/settings"
          className="pressable flex h-11 w-11 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)]"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" strokeWidth={1.75} />
        </Link>
      </div>
    </header>
  );
}

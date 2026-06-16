import Link from "next/link";
import { Bell } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  showIcons = true,
}: {
  title: string;
  subtitle?: string;
  showIcons?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-[var(--foreground)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
        )}
      </div>
      {showIcons && (
        <div className="flex shrink-0 gap-2 pt-1">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--muted)]"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-xs font-bold text-[var(--primary)]"
            aria-label="Settings"
          >
            J
          </Link>
        </div>
      )}
    </div>
  );
}

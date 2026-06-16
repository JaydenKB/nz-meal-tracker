"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { SettingsForm } from "@/components/settings/settings-form";
import { ServerStatusBar } from "@/components/layout/server-status-bar";

function SettingsRow({
  label,
  value,
  href,
  onClick,
}: {
  label: string;
  value?: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="text-sm font-normal text-[var(--foreground)]">{label}</span>
      <div className="flex items-center gap-2">
        {value && (
          <span className="text-sm font-normal text-[var(--muted)]">{value}</span>
        )}
        <ChevronRight className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.75} />
      </div>
    </>
  );

  const className =
    "flex w-full items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3.5 last:border-b-0";

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h2>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)]">
        {children}
      </div>
    </section>
  );
}

export function SettingsPageClient() {
  return (
    <div className="mx-auto max-w-[430px] space-y-6 pb-4">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white text-[var(--foreground)]"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
        </Link>
        <h1 className="text-[1.75rem] font-medium text-[var(--foreground)]">Settings</h1>
      </header>

      <SettingsForm layout="grouped" />

      <SettingsSection title="Server">
        <div className="bg-white px-4 py-4">
          <ServerStatusBar />
          <p className="mt-2 text-xs font-normal text-[var(--muted)]">
            Add to home screen for app mode.
          </p>
        </div>
      </SettingsSection>
    </div>
  );
}

export { SettingsRow, SettingsSection };

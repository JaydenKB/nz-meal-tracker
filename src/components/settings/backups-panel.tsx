"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CloudUpload, Download, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BackupEntry = {
  fileName: string;
  createdAt: string;
  sizeBytes: number;
};

type BackupStatus = {
  enabled: boolean;
  directory: string;
  retentionCount: number;
  frequency: string;
  lastBackupAt: string | null;
  lastBackupStatus: string | null;
  lastBackupError: string | null;
  protected: boolean;
  stale: boolean;
  recent: BackupEntry[];
};

function formatAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} hours ago`;
  return `${Math.floor(ms / 86_400_000)} days ago`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupsPanel() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/backups");
    setStatus(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings(patch: Partial<BackupStatus>) {
    if (!status) return;
    const res = await fetch("/api/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateSettings",
        backupEnabled: patch.enabled ?? status.enabled,
        backupDirectory: patch.directory ?? status.directory,
        backupRetentionCount: patch.retentionCount ?? status.retentionCount,
        backupFrequency: patch.frequency ?? status.frequency,
      }),
    });
    setStatus(await res.json());
  }

  async function backupNow() {
    setBackingUp(true);
    setMessage(null);
    const res = await fetch("/api/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "backup" }),
    });
    const data = await res.json();
    setBackingUp(false);
    if (!res.ok) {
      setMessage(data.error ?? "Backup failed");
    } else {
      setMessage("Backup saved");
    }
    await load();
  }

  async function restore(fileName: string) {
    if (
      !confirm(
        "Restore this backup? This REPLACES all current data. A safety backup of today is taken first.",
      )
    ) {
      return;
    }
    setRestoring(fileName);
    const res = await fetch("/api/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", fileName }),
    });
    const data = await res.json();
    setRestoring(null);
    if (!res.ok) {
      setMessage(data.error ?? "Restore failed");
      return;
    }
    window.location.reload();
  }

  async function handleImport(file: File) {
    if (
      !confirm(
        "Import this database? This REPLACES all current data. A safety backup is taken first.",
      )
    ) {
      return;
    }
    setImporting(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/backups/import", { method: "POST", body: form });
    const data = await res.json();
    setImporting(false);
    if (!res.ok) {
      setMessage(data.error ?? "Import failed");
      return;
    }
    window.location.reload();
  }

  const protectedOk = status?.protected && !status.stale;
  const warn =
    status &&
    (!status.enabled ||
      status.lastBackupStatus === "failed" ||
      status.stale ||
      !status.protected);

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-8">
      <header className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-medium">Backups</h1>
      </header>

      {loading || !status ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : (
        <>
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${
              protectedOk
                ? "border-[var(--success)]/30 bg-[var(--green-soft)]"
                : "border-[#e8b86d]/50 bg-[#fef9f0]"
            }`}
          >
            <Shield
              className={`h-5 w-5 shrink-0 ${protectedOk ? "text-[var(--primary)]" : "text-[#b45309]"}`}
            />
            <div>
              <p className="font-medium">
                {protectedOk ? "Protected" : warn ? "Needs attention" : "Not protected"}
              </p>
              <p className="text-sm text-[var(--muted)]">
                Last backup {formatAgo(status.lastBackupAt)}
                {status.lastBackupStatus === "failed" && status.lastBackupError
                  ? ` · ${status.lastBackupError}`
                  : ""}
              </p>
            </div>
          </div>

          <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-white">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3.5">
              <span className="text-sm">Auto-backup</span>
              <button
                type="button"
                role="switch"
                aria-checked={status.enabled}
                onClick={() => void saveSettings({ enabled: !status.enabled })}
                className={`relative h-7 w-12 rounded-full transition ${
                  status.enabled ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                    status.enabled ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
            <div className="border-b border-[var(--border)] px-4 py-3.5">
              <Label className="text-xs text-[var(--muted)]">Frequency</Label>
              <select
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                value={status.frequency}
                onChange={(e) => void saveSettings({ frequency: e.target.value })}
              >
                <option value="daily">Daily + on changes</option>
                <option value="on_change">On changes only</option>
              </select>
            </div>
            <div className="border-b border-[var(--border)] px-4 py-3.5">
              <Label className="text-xs text-[var(--muted)]">Keep last</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={status.retentionCount}
                onChange={(e) =>
                  void saveSettings({ retentionCount: Number(e.target.value) || 14 })
                }
                className="mt-1"
              />
            </div>
            <div className="px-4 py-3.5">
              <Label className="text-xs text-[var(--muted)]">Backup directory</Label>
              <Input
                value={status.directory}
                onChange={(e) => void saveSettings({ directory: e.target.value })}
                className="mt-1 font-mono text-xs"
              />
              <p className="mt-2 text-xs text-[var(--muted)]">
                Point this at a second drive or synced folder (e.g. Mac Mini over LAN) so backups
                aren&apos;t on the same disk as your database.
              </p>
            </div>
          </section>

          {status.recent.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Recent backups
              </h2>
              <div className="divide-y divide-[var(--border)] rounded-[var(--radius-card)] border border-[var(--border)] bg-white">
                {status.recent.map((b) => (
                  <div key={b.fileName} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{formatAgo(b.createdAt)}</p>
                      <p className="text-xs text-[var(--muted)]">{formatSize(b.sizeBytes)}</p>
                    </div>
                    <button
                      type="button"
                      className="text-sm font-medium text-[var(--primary)]"
                      disabled={restoring === b.fileName}
                      onClick={() => void restore(b.fileName)}
                    >
                      {restoring === b.fileName ? "…" : "Restore"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="space-y-2">
            <Button className="w-full" disabled={backingUp} onClick={() => void backupNow()}>
              <CloudUpload className="h-4 w-4" />
              {backingUp ? "Backing up…" : "Back up now"}
            </Button>
            <a href="/api/backups/export" className="block">
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4" />
                Export database
              </Button>
            </a>
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--beige)] px-4 py-3 text-sm font-medium">
              {importing ? "Importing…" : "Import database…"}
              <input
                type="file"
                accept=".db,application/octet-stream"
                className="hidden"
                disabled={importing}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImport(f);
                }}
              />
            </label>
          </div>

          {message && (
            <p className="text-center text-sm text-[var(--muted)]">{message}</p>
          )}
        </>
      )}
    </div>
  );
}

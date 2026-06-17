import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { getSqlite, getDbPath, reopenDatabase } from "@/lib/db";
import { getAppSettings, updateAppSettings } from "@/lib/log/queries";
import { backupFileName, defaultBackupDirectory } from "@/lib/backup/paths";

export type BackupEntry = {
  fileName: string;
  filePath: string;
  createdAt: string;
  sizeBytes: number;
};

export type BackupStatus = {
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

const DAILY_MS = 24 * 60 * 60 * 1000;

function resolveBackupDir(settingsDir: string | null | undefined): string {
  const dir = settingsDir?.trim() || defaultBackupDirectory();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function verifyBackupIntegrity(filePath: string): boolean {
  const test = new Database(filePath, { readonly: true });
  try {
    const rows = test.pragma("integrity_check") as { integrity_check: string }[];
    return rows.every((r) => r.integrity_check === "ok");
  } finally {
    test.close();
  }
}

/** Safe online backup via SQLite backup API — not a raw file copy. */
export function writeSafeBackup(destPath: string): void {
  const dir = path.dirname(destPath);
  fs.mkdirSync(dir, { recursive: true });
  const tempPath = `${destPath}.tmp`;
  if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

  const sqlite = getSqlite();
  sqlite.pragma("wal_checkpoint(PASSIVE)");
  sqlite.backup(tempPath);

  if (!verifyBackupIntegrity(tempPath)) {
    fs.unlinkSync(tempPath);
    throw new Error("Backup failed integrity check");
  }

  fs.renameSync(tempPath, destPath);
}

function listBackupFiles(dir: string): BackupEntry[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("backup-") && f.endsWith(".db"))
    .map((fileName) => {
      const filePath = path.join(dir, fileName);
      const stat = fs.statSync(filePath);
      const match = fileName.match(/^backup-(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/);
      const createdAt = match
        ? `${match[1]}T${match[2].replace(/-/g, ":")}:00.000Z`
        : stat.mtime.toISOString();
      return {
        fileName,
        filePath,
        createdAt,
        sizeBytes: stat.size,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function pruneOldBackups(dir: string, keep: number): void {
  const files = listBackupFiles(dir);
  for (const entry of files.slice(keep)) {
    try {
      fs.unlinkSync(entry.filePath);
    } catch {
      /* best effort */
    }
  }
}

async function recordBackupResult(ok: boolean, error?: string): Promise<void> {
  await updateAppSettings({
    lastBackupAt: new Date().toISOString(),
    lastBackupStatus: ok ? "ok" : "failed",
    lastBackupError: ok ? null : (error ?? "Unknown error"),
  });
}

export async function runBackupNow(reason: "manual" | "scheduled" | "on_change" | "pre_restore" = "manual"): Promise<BackupEntry> {
  const settings = await getAppSettings();
  const dir = resolveBackupDir(settings.backupDirectory);
  const fileName = backupFileName();
  const destPath = path.join(dir, fileName);

  try {
    writeSafeBackup(destPath);
    await recordBackupResult(true);
    pruneOldBackups(dir, Math.max(1, settings.backupRetentionCount ?? 14));
    return listBackupFiles(dir).find((b) => b.fileName === fileName)!;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Backup failed";
    await recordBackupResult(false, message);
    throw new Error(message);
  }
}

export async function getBackupStatus(): Promise<BackupStatus> {
  const settings = await getAppSettings();
  const dir = resolveBackupDir(settings.backupDirectory);
  const recent = listBackupFiles(dir);
  const lastAt = settings.lastBackupAt ?? recent[0]?.createdAt ?? null;
  const stale =
    settings.backupEnabled &&
    lastAt != null &&
    Date.now() - new Date(lastAt).getTime() > DAILY_MS * 2;

  return {
    enabled: settings.backupEnabled ?? true,
    directory: dir,
    retentionCount: settings.backupRetentionCount ?? 14,
    frequency: settings.backupFrequency ?? "daily",
    lastBackupAt: lastAt,
    lastBackupStatus: settings.lastBackupStatus ?? null,
    lastBackupError: settings.lastBackupError ?? null,
    protected:
      settings.backupEnabled &&
      settings.lastBackupStatus === "ok" &&
      recent.length > 0,
    stale,
    recent: recent.slice(0, 20),
  };
}

export async function maybeRunScheduledBackup(): Promise<void> {
  const settings = await getAppSettings();
  if (!settings.backupEnabled) return;

  const lastAt = settings.lastBackupAt ? new Date(settings.lastBackupAt).getTime() : 0;
  const due = Date.now() - lastAt >= DAILY_MS;
  if (due) {
    try {
      await runBackupNow("scheduled");
    } catch {
      /* status recorded in settings */
    }
  }
}

export async function restoreFromBackup(backupPath: string): Promise<void> {
  if (!fs.existsSync(backupPath)) {
    throw new Error("Backup file not found");
  }
  if (!verifyBackupIntegrity(backupPath)) {
    throw new Error("Backup file failed integrity check");
  }

  const safetyDir = resolveBackupDir((await getAppSettings()).backupDirectory);
  const safetyPath = path.join(safetyDir, `pre-restore-${backupFileName()}`);
  writeSafeBackup(safetyPath);

  const sqlite = getSqlite();
  sqlite.pragma("wal_checkpoint(TRUNCATE)");
  sqlite.close();

  const dbPath = getDbPath();
  fs.copyFileSync(backupPath, dbPath);
  const wal = `${dbPath}-wal`;
  const shm = `${dbPath}-shm`;
  if (fs.existsSync(wal)) fs.unlinkSync(wal);
  if (fs.existsSync(shm)) fs.unlinkSync(shm);

  reopenDatabase();
}

export function exportDatabasePath(): string {
  return getDbPath();
}

export async function importDatabaseFromUpload(sourcePath: string): Promise<void> {
  if (!verifyBackupIntegrity(sourcePath)) {
    throw new Error("Import file failed integrity check");
  }
  await restoreFromBackup(sourcePath);
}

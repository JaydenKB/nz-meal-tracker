import os from "os";
import path from "path";

/** Default backup dir outside the project tree (survives redeploys). */
export function defaultBackupDirectory(): string {
  if (process.env.BACKUP_DIR?.trim()) {
    return process.env.BACKUP_DIR.trim();
  }
  return path.join(os.homedir(), "nz-meal-tracker-backups");
}

export function backupFileName(date = new Date()): string {
  const stamp = date
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  return `backup-${stamp}.db`;
}

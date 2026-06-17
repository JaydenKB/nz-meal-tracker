import { NextResponse } from "next/server";
import {
  getBackupStatus,
  runBackupNow,
  restoreFromBackup,
} from "@/lib/backup/service";
import { defaultBackupDirectory } from "@/lib/backup/paths";
import { getAppSettings, updateAppSettings } from "@/lib/log/queries";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  const status = await getBackupStatus();
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (body.action === "backup") {
    try {
      const entry = await runBackupNow("manual");
      return NextResponse.json({ ok: true, entry });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Backup failed" },
        { status: 500 },
      );
    }
  }

  if (body.action === "updateSettings") {
    const settings = await getAppSettings();
    await updateAppSettings({
      backupEnabled: body.backupEnabled ?? settings.backupEnabled,
      backupDirectory: body.backupDirectory?.trim() || null,
      backupRetentionCount: Math.max(
        1,
        Number(body.backupRetentionCount ?? settings.backupRetentionCount ?? 14),
      ),
      backupFrequency: body.backupFrequency ?? settings.backupFrequency,
    });
    return NextResponse.json(await getBackupStatus());
  }

  if (body.action === "restore") {
    const fileName = String(body.fileName ?? "");
    if (!fileName || fileName.includes("..")) {
      return NextResponse.json({ error: "Invalid backup file" }, { status: 400 });
    }
    const settings = await getAppSettings();
    const dir = settings.backupDirectory?.trim() || defaultBackupDirectory();
    const backupPath = path.join(dir, fileName);
    try {
      await restoreFromBackup(backupPath);
      return NextResponse.json({ ok: true, reload: true });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Restore failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

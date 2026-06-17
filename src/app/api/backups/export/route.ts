import { NextResponse } from "next/server";
import fs from "fs";
import { exportDatabasePath } from "@/lib/backup/service";
import { runBackupNow } from "@/lib/backup/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    await runBackupNow("manual");
  } catch {
    /* export even if scheduled backup fails */
  }

  const dbPath = exportDatabasePath();
  const buffer = fs.readFileSync(dbPath);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="nz-meal-tracker-${stamp}.db"`,
    },
  });
}

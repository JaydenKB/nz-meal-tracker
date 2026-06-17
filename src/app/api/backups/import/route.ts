import { NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import { importDatabaseFromUpload } from "@/lib/backup/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const tempPath = path.join(os.tmpdir(), `nz-import-${Date.now()}.db`);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(tempPath, buffer);

  try {
    await importDatabaseFromUpload(tempPath);
    return NextResponse.json({ ok: true, reload: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 },
    );
  } finally {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      /* ignore */
    }
  }
}

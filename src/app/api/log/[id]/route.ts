import { NextResponse } from "next/server";
import { deleteLogEntry } from "@/lib/log/queries";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await deleteLogEntry(Number(id));
  return NextResponse.json({ ok: true });
}

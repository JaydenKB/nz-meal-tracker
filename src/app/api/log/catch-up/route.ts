import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getUnresolvedPastPlanned,
  resolveCatchUpEntry,
  skipAllUnresolvedPastPlanned,
} from "@/lib/log/catch-up";
import { notifyDbWrite } from "@/lib/backup/trigger";

export const runtime = "nodejs";

export async function GET() {
  const entries = await getUnresolvedPastPlanned();
  return NextResponse.json({ count: entries.length, entries });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === "skip-all") {
    const count = await skipAllUnresolvedPastPlanned();
    revalidatePath("/");
    revalidatePath("/catch-up");
    notifyDbWrite();
    return NextResponse.json({ ok: true, resolved: count });
  }

  const id = Number(body.id);
  const action = body.action as "ate-it" | "skipped" | "replaced";
  if (!Number.isFinite(id) || !["ate-it", "skipped", "replaced"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await resolveCatchUpEntry(id, action);
  if (!result.entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  revalidatePath("/");
  revalidatePath("/catch-up");
  notifyDbWrite();

  return NextResponse.json(result);
}

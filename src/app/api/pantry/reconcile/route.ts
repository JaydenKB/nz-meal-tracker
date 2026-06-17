import { NextResponse } from "next/server";
import {
  applyReconcileCorrections,
  getPantryDriftStatus,
  getReconcileCandidates,
  markPantryReconciledServer,
} from "@/lib/pantry/reconcile";
import { getPantryRows } from "@/lib/pantry/queries";
import { notifyDbWrite } from "@/lib/backup/trigger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get("all") === "1";
  const drift = await getPantryDriftStatus();
  const items = await getReconcileCandidates(showAll);

  const rows = await getPantryRows();
  const ingredientMap = Object.fromEntries(rows.map((r) => [r.ingredientId, r.ingredient]));

  return NextResponse.json({
    drift,
    items: items.map((i) => ({
      ...i,
      ingredient: ingredientMap[i.ingredientId],
    })),
    totalPantryCount: rows.length,
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === "confirm-all") {
    await markPantryReconciledServer();
    notifyDbWrite();
    return NextResponse.json({ ok: true, changed: 0 });
  }

  if (body.action === "save") {
    const corrections = Array.isArray(body.corrections) ? body.corrections : [];
    const changed = await applyReconcileCorrections(
      corrections.map((c: { ingredientId: number; quantity: number; unit: string }) => ({
        ingredientId: Number(c.ingredientId),
        quantity: Number(c.quantity),
        unit: String(c.unit),
      })),
    );
    notifyDbWrite();
    return NextResponse.json({ ok: true, changed });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

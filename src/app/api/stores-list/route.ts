import { NextResponse } from "next/server";
import { getAllStores } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET() {
  const stores = await getAllStores();
  return NextResponse.json({ stores });
}

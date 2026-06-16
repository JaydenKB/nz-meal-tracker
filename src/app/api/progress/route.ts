import { NextResponse } from "next/server";
import { getProgressStats } from "@/lib/progress/stats";

export const runtime = "nodejs";

export async function GET() {
  const stats = await getProgressStats();
  return NextResponse.json(stats);
}

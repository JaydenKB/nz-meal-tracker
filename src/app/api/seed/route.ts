import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/db/seed";

export const runtime = "nodejs";

export async function POST() {
  const result = await seedDatabase();
  return NextResponse.json(result);
}

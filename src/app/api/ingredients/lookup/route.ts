import { NextResponse } from "next/server";
import { lookupNutrition } from "@/lib/nutrition/lookup";
import { serializeNutrients } from "@/lib/nutrition/nutrients";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing query parameter q" }, { status: 400 });
  }

  try {
    const result = await lookupNutrition(query);
    if (!result) {
      return NextResponse.json({ error: "No match in public databases" }, { status: 404 });
    }
    return NextResponse.json({
      ...result,
      nutrientsJson: serializeNutrients(result.nutrients),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const query = String(body.query ?? body.name ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    const result = await lookupNutrition(query);
    if (!result) {
      return NextResponse.json({ error: "No match in public databases" }, { status: 404 });
    }
    return NextResponse.json({
      ...result,
      nutrientsJson: serializeNutrients(result.nutrients),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

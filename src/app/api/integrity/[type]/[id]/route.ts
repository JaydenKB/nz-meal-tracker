import { NextResponse } from "next/server";
import {
  getIngredientDependencies,
  getRecipeDependencies,
  getStoreDependencies,
} from "@/lib/integrity/dependencies";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const { type, id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  if (type === "ingredient") {
    const deps = await getIngredientDependencies(numId);
    if (!deps) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(deps);
  }

  if (type === "recipe") {
    const deps = await getRecipeDependencies(numId);
    if (!deps) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(deps);
  }

  if (type === "store") {
    const deps = await getStoreDependencies(numId);
    if (!deps) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(deps);
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}

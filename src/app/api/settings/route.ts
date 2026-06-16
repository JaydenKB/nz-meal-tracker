import { NextResponse } from "next/server";
import { getAppSettings, updateAppSettings } from "@/lib/log/queries";

export const runtime = "nodejs";

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const settings = await updateAppSettings({
    ollamaBaseUrl: body.ollamaBaseUrl != null ? String(body.ollamaBaseUrl) : undefined,
    ollamaModel: body.ollamaModel != null ? String(body.ollamaModel) : undefined,
  });
  return NextResponse.json(settings);
}

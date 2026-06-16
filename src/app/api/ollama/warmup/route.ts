import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/log/queries";
import { OLLAMA_KEEP_ALIVE } from "@/lib/ollama/client";

export const runtime = "nodejs";

async function preloadModel(baseUrl: string, model: string): Promise<void> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/generate`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: "ok",
      stream: false,
      keep_alive: OLLAMA_KEEP_ALIVE,
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${model}: ${body || res.status}`);
  }
}

/** Load text + vision models into VRAM so the first real request is fast. */
export async function POST() {
  const settings = await getAppSettings();
  const baseUrl = settings.ollamaBaseUrl;
  const loaded: string[] = [];
  const errors: string[] = [];

  for (const model of [settings.ollamaModel, settings.ollamaVisionModel]) {
    try {
      await preloadModel(baseUrl, model);
      loaded.push(model);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (loaded.length === 0) {
    return NextResponse.json(
      { ok: false, error: errors.join("; ") || "Warmup failed" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    loaded,
    keepAlive: OLLAMA_KEEP_ALIVE,
    errors: errors.length ? errors : undefined,
  });
}

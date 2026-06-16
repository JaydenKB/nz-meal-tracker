import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/log/queries";
import { listOllamaModels, modelIsAvailable } from "@/lib/ollama/client";

export const runtime = "nodejs";

export async function GET() {
  const settings = await getAppSettings();

  try {
    const models = await listOllamaModels(settings.ollamaBaseUrl);
    return NextResponse.json({
      ok: true,
      baseUrl: settings.ollamaBaseUrl,
      textModel: settings.ollamaModel,
      visionModel: settings.ollamaVisionModel,
      textModelReady: modelIsAvailable(models, settings.ollamaModel),
      visionModelReady: modelIsAvailable(models, settings.ollamaVisionModel),
      installedModels: models,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ollama unreachable";
    return NextResponse.json(
      {
        ok: false,
        baseUrl: settings.ollamaBaseUrl,
        textModel: settings.ollamaModel,
        visionModel: settings.ollamaVisionModel,
        error: message,
      },
      { status: 503 },
    );
  }
}

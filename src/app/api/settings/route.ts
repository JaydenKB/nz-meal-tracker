import { NextResponse } from "next/server";
import { getAppSettings, updateAppSettings } from "@/lib/log/queries";
import { isNewApiKeyValue, sanitizeSettingsForClient } from "@/lib/ai/settings";
import { AI_PROVIDERS, type AiProvider } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json(sanitizeSettingsForClient(settings));
}

export async function PUT(request: Request) {
  const body = await request.json();

  const patch: Parameters<typeof updateAppSettings>[0] = {
    ollamaBaseUrl: body.ollamaBaseUrl != null ? String(body.ollamaBaseUrl) : undefined,
    ollamaModel: body.ollamaModel != null ? String(body.ollamaModel) : undefined,
    ollamaVisionModel:
      body.ollamaVisionModel != null ? String(body.ollamaVisionModel) : undefined,
    aiProvider:
      typeof body.aiProvider === "string" &&
      (AI_PROVIDERS as string[]).includes(body.aiProvider)
        ? (body.aiProvider as AiProvider)
        : undefined,
    openaiTextModel:
      body.openaiTextModel != null ? String(body.openaiTextModel) : undefined,
    openaiVisionModel:
      body.openaiVisionModel != null ? String(body.openaiVisionModel) : undefined,
    anthropicTextModel:
      body.anthropicTextModel != null ? String(body.anthropicTextModel) : undefined,
  };

  if (isNewApiKeyValue(body.openaiApiKey)) {
    patch.openaiApiKey = body.openaiApiKey.trim();
  } else if (body.clearOpenaiApiKey === true) {
    patch.openaiApiKey = null;
  }

  if (isNewApiKeyValue(body.anthropicApiKey)) {
    patch.anthropicApiKey = body.anthropicApiKey.trim();
  } else if (body.clearAnthropicApiKey === true) {
    patch.anthropicApiKey = null;
  }

  const settings = await updateAppSettings(patch);
  return NextResponse.json(sanitizeSettingsForClient(settings));
}

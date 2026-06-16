import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/log/queries";
import {
  effectiveAiProvider,
  isAnthropicConfigured,
  isOpenAIConfigured,
  providerDisplayName,
  providerTradeoff,
  resolveAnthropicApiKey,
  resolveOpenAIApiKey,
} from "@/lib/ai/settings";
import { testAnthropicConnection } from "@/lib/anthropic/client";
import { testOpenAIConnection } from "@/lib/openai/client";
import { listOllamaModels, modelIsAvailable } from "@/lib/ollama/client";

export const runtime = "nodejs";

export async function GET() {
  const settings = await getAppSettings();
  const provider = effectiveAiProvider(settings);

  let ollama: Record<string, unknown> = { ok: false };
  try {
    const models = await listOllamaModels(settings.ollamaBaseUrl);
    ollama = {
      ok: true,
      baseUrl: settings.ollamaBaseUrl,
      textModel: settings.ollamaModel,
      visionModel: settings.ollamaVisionModel,
      textModelReady: modelIsAvailable(models, settings.ollamaModel),
      visionModelReady: modelIsAvailable(models, settings.ollamaVisionModel),
      installedModels: models,
    };
  } catch (error) {
    ollama = {
      ok: false,
      baseUrl: settings.ollamaBaseUrl,
      error: error instanceof Error ? error.message : "Ollama unreachable",
    };
  }

  const openaiKey = resolveOpenAIApiKey(settings);
  let openai: Record<string, unknown> = {
    configured: isOpenAIConfigured(settings),
    textModel: settings.openaiTextModel,
    visionModel: settings.openaiVisionModel,
    ok: false,
  };

  if (openaiKey) {
    try {
      await testOpenAIConnection(openaiKey);
      openai = { ...openai, ok: true };
    } catch (error) {
      openai = {
        ...openai,
        ok: false,
        error: error instanceof Error ? error.message : "OpenAI connection failed",
      };
    }
  }

  const anthropicKey = resolveAnthropicApiKey(settings);
  let anthropic: Record<string, unknown> = {
    configured: isAnthropicConfigured(settings),
    textModel: settings.anthropicTextModel,
    ok: false,
  };

  if (anthropicKey) {
    try {
      await testAnthropicConnection(anthropicKey, settings.anthropicTextModel);
      anthropic = { ...anthropic, ok: true };
    } catch (error) {
      anthropic = {
        ...anthropic,
        ok: false,
        error: error instanceof Error ? error.message : "Anthropic connection failed",
      };
    }
  }

  return NextResponse.json({
    provider,
    aiProviderSetting: settings.aiProvider,
    providerLabel: providerDisplayName(provider),
    providerTradeoff: providerTradeoff(settings.aiProvider as typeof provider),
    openaiConfigured: isOpenAIConfigured(settings),
    anthropicConfigured: isAnthropicConfigured(settings),
    imageGenAvailable: isOpenAIConfigured(settings),
    ollama,
    openai,
    anthropic,
  });
}

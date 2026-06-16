import type { AppSettings } from "@/lib/db/schema";
import {
  createOpenAIClient,
  openaiGenerateJson,
  openaiGenerateProse,
  openaiVisionJson,
} from "@/lib/openai/client";
import { buildScanPrompt, parseScanJson } from "@/lib/import/ollama-vision";
import type { RawScannedItem } from "@/lib/import/types";
import { ollamaGenerateText } from "@/lib/ollama/client";
import { scanSingleImageWithRetry } from "@/lib/import/ollama-vision";
import { AiProviderError } from "@/lib/ai/errors";
import {
  effectiveAiProvider,
  providerDisplayName,
  resolveAnthropicApiKey,
  resolveOpenAIApiKey,
} from "@/lib/ai/settings";
import {
  anthropicGenerateProse,
  anthropicGenerateRecipes,
  createAnthropicClient,
} from "@/lib/anthropic/client";

function missingOpenAIKeyError(): Error {
  return new AiProviderError(
    "not_configured",
    "OpenAI API key not configured. Go to Settings → AI provider → OpenAI and paste your key.",
    "openai",
  );
}

/** General-purpose JSON text generation (suggestions, etc.) — not recipe-structured. */
export async function aiGenerateText(settings: AppSettings, prompt: string): Promise<string> {
  const provider = effectiveAiProvider(settings);

  if (provider === "openai") {
    const apiKey = resolveOpenAIApiKey(settings);
    if (!apiKey) throw missingOpenAIKeyError();
    const client = createOpenAIClient(apiKey);
    return openaiGenerateJson(client, settings.openaiTextModel, prompt);
  }

  if (provider === "anthropic") {
    const apiKey = resolveAnthropicApiKey(settings);
    if (!apiKey) {
      throw new AiProviderError(
        "not_configured",
        "Anthropic API key not configured.",
        "anthropic",
      );
    }
    const recipes = await anthropicGenerateRecipes(
      createAnthropicClient(apiKey),
      settings.anthropicTextModel,
      prompt,
    );
    return JSON.stringify({ recipes });
  }

  return ollamaGenerateText(settings.ollamaBaseUrl, settings.ollamaModel, prompt, {
    formatJson: true,
    temperature: 0.85,
  });
}

/** Plain prose generation (cooking step elaboration, etc.) — no JSON contract. */
export async function aiGenerateProse(settings: AppSettings, prompt: string): Promise<string> {
  const provider = effectiveAiProvider(settings);

  if (provider === "openai") {
    const apiKey = resolveOpenAIApiKey(settings);
    if (!apiKey) throw missingOpenAIKeyError();
    const client = createOpenAIClient(apiKey);
    return openaiGenerateProse(client, settings.openaiTextModel, prompt);
  }

  if (provider === "anthropic") {
    const apiKey = resolveAnthropicApiKey(settings);
    if (!apiKey) {
      throw new AiProviderError(
        "not_configured",
        "Anthropic API key not configured.",
        "anthropic",
      );
    }
    return anthropicGenerateProse(createAnthropicClient(apiKey), settings.anthropicTextModel, prompt);
  }

  return ollamaGenerateText(settings.ollamaBaseUrl, settings.ollamaModel, prompt, {
    formatJson: false,
    temperature: 0.75,
    top_p: 0.9,
  });
}

export async function aiScanSingleImage(
  settings: AppSettings,
  storeName: string,
  image: string,
): Promise<RawScannedItem[]> {
  if (effectiveAiProvider(settings) === "openai") {
    const apiKey = resolveOpenAIApiKey(settings);
    if (!apiKey) throw missingOpenAIKeyError();
    const client = createOpenAIClient(apiKey);
    const prompt = buildScanPrompt(storeName, true);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await openaiVisionJson(client, settings.openaiVisionModel, prompt, image);
        return parseScanJson(raw);
      } catch (e) {
        lastError = e instanceof Error ? e : new Error("OpenAI scan failed");
      }
    }

    throw lastError ?? new Error("Failed to scan screenshot with OpenAI");
  }

  return scanSingleImageWithRetry(
    settings.ollamaBaseUrl,
    settings.ollamaVisionModel,
    storeName,
    image,
  );
}

export function aiProviderLabel(settings: AppSettings): string {
  return providerDisplayName(effectiveAiProvider(settings));
}

export function aiVisionModelLabel(settings: AppSettings): string {
  return effectiveAiProvider(settings) === "openai"
    ? settings.openaiVisionModel
    : settings.ollamaVisionModel;
}

import type { AppSettings } from "@/lib/db/schema";
import {
  createOpenAIClient,
  openaiGenerateJson,
  openaiGenerateProse,
  openaiVisionJson,
  openaiVisionJsonMulti,
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
import {
  buildGroceryDetectPrompt,
  parseGroceryDetectJson,
  type DetectedGrocery,
} from "@/lib/import/grocery-detect";
import {
  buildLabelScanPrompt,
  parseLabelScanJson,
} from "@/lib/import/label-scan";
import { callOllamaVision } from "@/lib/import/ollama-vision";

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

export async function aiDetectGroceries(
  settings: AppSettings,
  image: string,
): Promise<DetectedGrocery[]> {
  const prompt = buildGroceryDetectPrompt();
  const provider = effectiveAiProvider(settings);

  if (provider === "openai") {
    const apiKey = resolveOpenAIApiKey(settings);
    if (!apiKey) throw missingOpenAIKeyError();
    const client = createOpenAIClient(apiKey);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await openaiVisionJson(client, settings.openaiVisionModel, prompt, image);
        return parseGroceryDetectJson(raw);
      } catch (e) {
        lastError = e instanceof Error ? e : new Error("OpenAI grocery detect failed");
      }
    }
    throw lastError ?? new Error("Failed to detect groceries with OpenAI");
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callOllamaVision(
        settings.ollamaBaseUrl,
        settings.ollamaVisionModel,
        prompt,
        [image],
      );
      return parseGroceryDetectJson(raw);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("Grocery detect parse failed");
    }
  }
  throw lastError ?? new Error("Failed to detect groceries");
}

export async function aiScanProductLabels(
  settings: AppSettings,
  images: string[],
  hintName?: string,
): Promise<RawScannedItem> {
  if (images.length === 0) throw new Error("At least one label image required");
  const prompt = buildLabelScanPrompt(hintName);
  const provider = effectiveAiProvider(settings);

  if (provider === "openai") {
    const apiKey = resolveOpenAIApiKey(settings);
    if (!apiKey) throw missingOpenAIKeyError();
    const client = createOpenAIClient(apiKey);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await openaiVisionJsonMulti(
          client,
          settings.openaiVisionModel,
          prompt,
          images,
        );
        return parseLabelScanJson(raw);
      } catch (e) {
        lastError = e instanceof Error ? e : new Error("OpenAI label scan failed");
      }
    }
    throw lastError ?? new Error("Failed to scan product labels with OpenAI");
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callOllamaVision(
        settings.ollamaBaseUrl,
        settings.ollamaVisionModel,
        prompt,
        images,
      );
      return parseLabelScanJson(raw);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("Label scan parse failed");
    }
  }
  throw lastError ?? new Error("Failed to scan product labels");
}

export function aiProviderLabel(settings: AppSettings): string {
  return providerDisplayName(effectiveAiProvider(settings));
}

export function aiVisionModelLabel(settings: AppSettings): string {
  return effectiveAiProvider(settings) === "openai"
    ? settings.openaiVisionModel
    : settings.ollamaVisionModel;
}

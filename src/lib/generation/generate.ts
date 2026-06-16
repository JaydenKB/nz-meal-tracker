import type { AppSettings } from "@/lib/db/schema";
import { AiProviderError } from "@/lib/ai/errors";
import {
  assertProviderConfigured,
  resolveAnthropicApiKey,
  resolveOpenAIApiKey,
} from "@/lib/ai/settings";
import {
  anthropicGenerateRecipes,
  createAnthropicClient,
} from "@/lib/anthropic/client";
import { parseGeneratedRecipesJson } from "@/lib/generation/parse";
import type { RawGeneratedRecipe } from "@/lib/generation/types";
import { ollamaGenerateText } from "@/lib/ollama/client";
import {
  createOpenAIClient,
  openaiGenerateStructuredRecipes,
} from "@/lib/openai/client";

export type GenerateRecipesOptions = {
  settings: AppSettings;
  retries?: number;
};

async function generateWithProvider(
  settings: AppSettings,
  prompt: string,
): Promise<RawGeneratedRecipe[]> {
  const provider = assertProviderConfigured(settings);

  switch (provider) {
    case "openai": {
      const apiKey = resolveOpenAIApiKey(settings)!;
      const client = createOpenAIClient(apiKey);
      return openaiGenerateStructuredRecipes(client, settings.openaiTextModel, prompt);
    }
    case "anthropic": {
      const apiKey = resolveAnthropicApiKey(settings)!;
      const client = createAnthropicClient(apiKey);
      return anthropicGenerateRecipes(client, settings.anthropicTextModel, prompt);
    }
    case "local": {
      const raw = await ollamaGenerateText(
        settings.ollamaBaseUrl,
        settings.ollamaModel,
        prompt,
        { formatJson: true, temperature: 0.85, top_p: 0.9 },
      );
      return parseGeneratedRecipesJson(raw);
    }
    default:
      throw new AiProviderError("provider_error", "Unknown AI provider", "local");
  }
}

/** Provider-agnostic recipe generation with structured output per adapter + defensive parsing. */
export async function generateRecipes(
  prompt: string,
  opts: GenerateRecipesOptions,
): Promise<RawGeneratedRecipe[]> {
  const retries = opts.retries ?? 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await generateWithProvider(opts.settings, prompt);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Generation failed");
      if (error instanceof AiProviderError && !error.retryable) throw error;
    }
  }

  throw lastError ?? new Error("Failed to generate recipes");
}

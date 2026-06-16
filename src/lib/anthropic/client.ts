import Anthropic from "@anthropic-ai/sdk";
import { AiProviderError } from "@/lib/ai/errors";
import { RECIPE_BATCH_JSON_SCHEMA } from "@/lib/generation/schema";
import { normalizeRecipeBatch } from "@/lib/generation/parse";
import type { RawGeneratedRecipe } from "@/lib/generation/types";

/** Suggested models — user can override in settings. Verify against Anthropic docs periodically. */
export const ANTHROPIC_TEXT_MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", hint: "Best balance" },
  { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", hint: "Faster · lower cost" },
] as const;

export function createAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

export async function anthropicGenerateRecipes(
  client: Anthropic,
  model: string,
  prompt: string,
): Promise<RawGeneratedRecipe[]> {
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 8192,
      temperature: 0.75,
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          name: "submit_recipes",
          description:
            "Submit the generated recipes as structured JSON matching the required schema.",
          input_schema: RECIPE_BATCH_JSON_SCHEMA as unknown as Anthropic.Messages.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: "submit_recipes" },
    });

    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new AiProviderError(
        "parse_failed",
        "Anthropic did not return structured recipe data",
        "anthropic",
      );
    }

    return normalizeRecipeBatch(toolBlock.input);
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        throw new AiProviderError(
          "invalid_key",
          "Invalid Anthropic API key — check Settings or ANTHROPIC_API_KEY in .env.local",
          "anthropic",
          { cause: error },
        );
      }
      if (error.status === 429) {
        throw new AiProviderError(
          "rate_limit",
          "Anthropic rate limit hit — wait a moment and try again",
          "anthropic",
          { retryable: true, cause: error },
        );
      }
      throw new AiProviderError(
        "provider_error",
        `Anthropic error (${error.status}): ${error.message}`,
        "anthropic",
        { cause: error },
      );
    }
    if (error instanceof Error && /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(error.message)) {
      throw new AiProviderError(
        "network",
        "Cannot reach Anthropic API — check network connection",
        "anthropic",
        { retryable: true, cause: error },
      );
    }
    throw error;
  }
}

export async function anthropicGenerateProse(
  client: Anthropic,
  model: string,
  prompt: string,
): Promise<string> {
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 512,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!text) {
      throw new AiProviderError(
        "parse_failed",
        "Anthropic returned an empty response",
        "anthropic",
      );
    }
    return text;
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        throw new AiProviderError(
          "invalid_key",
          "Invalid Anthropic API key — check Settings or ANTHROPIC_API_KEY in .env.local",
          "anthropic",
          { cause: error },
        );
      }
      if (error.status === 429) {
        throw new AiProviderError(
          "rate_limit",
          "Anthropic rate limit hit — wait a moment and try again",
          "anthropic",
          { retryable: true, cause: error },
        );
      }
      throw new AiProviderError(
        "provider_error",
        `Anthropic error (${error.status}): ${error.message}`,
        "anthropic",
        { cause: error },
      );
    }
    if (error instanceof Error && /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(error.message)) {
      throw new AiProviderError(
        "network",
        "Cannot reach Anthropic API — check network connection",
        "anthropic",
        { retryable: true, cause: error },
      );
    }
    throw error;
  }
}

export async function testAnthropicConnection(apiKey: string, model: string): Promise<void> {
  const client = createAnthropicClient(apiKey);
  const response = await client.messages.create({
    model,
    max_tokens: 16,
    messages: [{ role: "user", content: "Reply with exactly: ok" }],
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text" || !text.text.trim()) {
    throw new Error("Anthropic returned an empty response");
  }
}

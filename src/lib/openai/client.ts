import OpenAI from "openai";
import { AiProviderError } from "@/lib/ai/errors";
import { parseGeneratedRecipesJson } from "@/lib/generation/parse";
import { RECIPE_BATCH_JSON_SCHEMA } from "@/lib/generation/schema";
import type { RawGeneratedRecipe } from "@/lib/generation/types";

export const OPENAI_TEXT_MODELS = [
  { id: "gpt-4o-mini", label: "GPT-4o mini", hint: "Fast · lower cost" },
  { id: "gpt-4o", label: "GPT-4o", hint: "Best quality" },
] as const;

export const OPENAI_VISION_MODELS = [
  { id: "gpt-4o", label: "GPT-4o", hint: "Best for screenshot OCR" },
  { id: "gpt-4o-mini", label: "GPT-4o mini", hint: "Faster · cheaper" },
] as const;

export function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

export async function openaiGenerateJson(
  client: OpenAI,
  model: string,
  prompt: string,
): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error(`Empty response from OpenAI (${model})`);
  }
  return text;
}

export async function openaiGenerateProse(
  client: OpenAI,
  model: string,
  prompt: string,
): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
      temperature: 0.7,
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new AiProviderError(
        "parse_failed",
        `Empty response from OpenAI (${model})`,
        "openai",
      );
    }
    return text;
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        throw new AiProviderError(
          "invalid_key",
          "Invalid OpenAI API key — check Settings or OPENAI_API_KEY in .env.local",
          "openai",
          { cause: error },
        );
      }
      if (error.status === 429) {
        const isQuota =
          error.code === "insufficient_quota" || /quota|billing/i.test(error.message);
        throw new AiProviderError(
          "rate_limit",
          isQuota
            ? "OpenAI quota exceeded — add billing at platform.openai.com/account/billing"
            : "OpenAI rate limit hit — try again in a moment",
          "openai",
          { retryable: !isQuota, cause: error },
        );
      }
      throw new AiProviderError(
        "provider_error",
        `OpenAI error (${error.status}): ${error.message}`,
        "openai",
        { cause: error },
      );
    }
    throw error;
  }
}

export async function openaiGenerateStructuredRecipes(
  client: OpenAI,
  model: string,
  prompt: string,
): Promise<RawGeneratedRecipe[]> {
  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.75,
      presence_penalty: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "recipe_batch",
          strict: true,
          schema: RECIPE_BATCH_JSON_SCHEMA,
        },
      },
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new AiProviderError(
        "parse_failed",
        `Empty response from OpenAI (${model})`,
        "openai",
      );
    }
    return parseGeneratedRecipesJson(text);
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        throw new AiProviderError(
          "invalid_key",
          "Invalid OpenAI API key — check Settings or OPENAI_API_KEY in .env.local",
          "openai",
          { cause: error },
        );
      }
      if (error.status === 429) {
        const isQuota =
          error.code === "insufficient_quota" || /quota|billing/i.test(error.message);
        throw new AiProviderError(
          "rate_limit",
          isQuota
            ? "OpenAI quota exceeded — add billing at platform.openai.com/account/billing"
            : "OpenAI rate limit hit — try again in a moment",
          "openai",
          { retryable: !isQuota, cause: error },
        );
      }
      throw new AiProviderError(
        "provider_error",
        `OpenAI error (${error.status}): ${error.message}`,
        "openai",
        { cause: error },
      );
    }
    if (error instanceof Error && /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(error.message)) {
      throw new AiProviderError(
        "network",
        "Cannot reach OpenAI API — check network connection",
        "openai",
        { retryable: true, cause: error },
      );
    }
    throw error;
  }
}

function toDataUrl(image: string): string {
  if (image.startsWith("data:")) return image;
  const base64 = image.includes(",") ? image.slice(image.indexOf(",") + 1) : image;
  return `data:image/jpeg;base64,${base64}`;
}

export async function openaiVisionJson(
  client: OpenAI,
  model: string,
  prompt: string,
  image: string,
): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: toDataUrl(image), detail: "high" } },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error(`Empty vision response from OpenAI (${model})`);
  }
  return text;
}

export async function testOpenAIConnection(apiKey: string): Promise<{ ok: true; model: string }> {
  const client = createOpenAIClient(apiKey);
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Reply with exactly: ok" }],
      max_tokens: 5,
    });
    const text = response.choices[0]?.message?.content?.trim();
    if (!text) throw new Error("OpenAI returned an empty response");
    return { ok: true, model: response.model };
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        throw new Error("Invalid API key — check OPENAI_API_KEY in .env.local or Settings");
      }
      if (error.status === 429) {
        const isQuota =
          error.code === "insufficient_quota" ||
          /quota|billing/i.test(error.message);
        throw new Error(
          isQuota
            ? "OpenAI quota exceeded — add billing credits at platform.openai.com/account/billing"
            : "OpenAI rate limit hit — try again in a moment",
        );
      }
      throw new Error(`OpenAI error (${error.status}): ${error.message}`);
    }
    if (error instanceof Error && /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(error.message)) {
      throw new Error("Cannot reach api.openai.com from this PC — check firewall or network");
    }
    throw error;
  }
}

async function imageResultToBuffer(item: OpenAI.Images.Image | undefined): Promise<Buffer> {
  if (!item) {
    throw new AiProviderError(
      "parse_failed",
      "No image data returned from OpenAI",
      "openai",
    );
  }

  if (item.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }

  if (item.url) {
    const res = await fetch(item.url);
    if (!res.ok) {
      throw new AiProviderError(
        "network",
        `Failed to download generated image (${res.status})`,
        "openai",
      );
    }
    return Buffer.from(await res.arrayBuffer());
  }

  throw new AiProviderError(
    "parse_failed",
    "No image data returned from OpenAI",
    "openai",
  );
}

function isImageModelFallbackError(error: unknown): boolean {
  if (!(error instanceof OpenAI.APIError)) return false;
  if (error.status === 404) return true;
  return (
    error.status === 400 &&
    /unknown parameter|invalid.*model|model.*not found|does not exist|not supported|not available/i.test(
      error.message,
    )
  );
}

function wrapOpenAIImageError(error: unknown): never {
  if (error instanceof AiProviderError) throw error;
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401) {
      throw new AiProviderError(
        "invalid_key",
        "Invalid OpenAI API key — check Settings or OPENAI_API_KEY in .env.local",
        "openai",
        { cause: error },
      );
    }
    if (error.status === 429) {
      const isQuota =
        error.code === "insufficient_quota" || /quota|billing/i.test(error.message);
      throw new AiProviderError(
        "rate_limit",
        isQuota
          ? "OpenAI quota exceeded — add billing at platform.openai.com/account/billing"
          : "OpenAI rate limit hit — try again in a moment",
        "openai",
        { retryable: !isQuota, cause: error },
      );
    }
    if (error.status === 400 && /content.?policy|safety/i.test(error.message)) {
      throw new AiProviderError(
        "provider_error",
        "OpenAI declined this image — try editing the recipe name or ingredients",
        "openai",
        { cause: error },
      );
    }
    throw new AiProviderError(
      "provider_error",
      `OpenAI image error (${error.status}): ${error.message}`,
      "openai",
      { cause: error },
    );
  }
  if (error instanceof Error && /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(error.message)) {
    throw new AiProviderError(
      "network",
      "Cannot reach OpenAI API — check network connection",
      "openai",
      { retryable: true, cause: error },
    );
  }
  throw error;
}

export async function openaiGenerateRecipeImage(
  client: OpenAI,
  prompt: string,
): Promise<Buffer> {
  const trimmedPrompt = prompt.slice(0, 4000);
  const models = [
    process.env.OPENAI_IMAGE_MODEL,
    "gpt-image-1",
    "gpt-image-2",
    "dall-e-3",
  ].filter((m): m is string => Boolean(m));

  let lastError: unknown;

  for (const model of [...new Set(models)]) {
    try {
      const result = await client.images.generate({
        model,
        prompt: trimmedPrompt,
        n: 1,
        size: "1024x1024",
      });
      return await imageResultToBuffer(result.data?.[0]);
    } catch (error) {
      lastError = error;
      if (isImageModelFallbackError(error)) continue;
      wrapOpenAIImageError(error);
    }
  }

  wrapOpenAIImageError(lastError);
}

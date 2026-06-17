import type { AiProvider } from "@/lib/db/schema";
import type { AiErrorKind } from "@/lib/ai/errors";
import {
  AiProviderError,
  aiErrorKind,
  aiErrorMessage,
  aiErrorStatus,
} from "@/lib/ai/errors";

const DEFAULT_TIMEOUT_MS = 120_000;
const VISION_TIMEOUT_MS = 180_000;

export function aiTimeoutMs(vision = false): number {
  return vision ? VISION_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new AiProviderError(
          "timeout",
          "AI request timed out — try again or check the provider is running.",
          "local",
          { retryable: true },
        ),
      );
    }, ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

/** Normalise any thrown value into AiProviderError. */
export function normalizeAiError(error: unknown, provider: AiProvider): AiProviderError {
  if (error instanceof AiProviderError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("timed out") || lower.includes("timeout")) {
    return new AiProviderError("timeout", message, provider, { retryable: true, cause: error });
  }
  if (lower.includes("model") && (lower.includes("not found") || lower.includes("does not exist"))) {
    return new AiProviderError("model_not_found", message, provider, { cause: error });
  }
  if (lower.includes("fetch") || lower.includes("econnrefused") || lower.includes("network")) {
    return new AiProviderError("network", message, provider, { retryable: true, cause: error });
  }
  if (lower.includes("json") || lower.includes("parse")) {
    return new AiProviderError("parse_failed", message, provider, { retryable: true, cause: error });
  }

  return new AiProviderError("provider_error", message, provider, { cause: error });
}

export type AiCallOptions = {
  provider?: AiProvider;
  timeoutMs?: number;
  retries?: number;
  fallbackHint?: string;
};

/**
 * Central AI wrapper: timeout, optional retry, normalised errors.
 */
export async function withAiCall<T>(
  fn: () => Promise<T>,
  options: AiCallOptions = {},
): Promise<T> {
  const provider = options.provider ?? "local";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? 1;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (e) {
      lastError = normalizeAiError(e, provider);
      const err = lastError as AiProviderError;
      if (attempt >= retries || !err.retryable) break;
    }
  }

  throw lastError;
}

export type AiErrorPayload = {
  error: string;
  code: AiErrorKind;
  retryable: boolean;
  fallbackHint?: string;
};

export function buildAiErrorPayload(
  error: unknown,
  fallbackHint?: string,
): AiErrorPayload {
  const message = aiErrorMessage(error);
  const code = aiErrorKind(error);
  const retryable = error instanceof AiProviderError ? error.retryable : code === "PROVIDER_DOWN" || code === "RATE_LIMITED" || code === "TIMEOUT" || code === "BAD_RESPONSE";

  return {
    error: message,
    code,
    retryable,
    fallbackHint,
  };
}

export function aiErrorJsonResponse(
  error: unknown,
  fallbackHint?: string,
): Response {
  const payload = buildAiErrorPayload(error, fallbackHint);
  return Response.json(payload, { status: aiErrorStatus(error) });
}

export const AI_FALLBACK_HINTS = {
  generate: "You can still create a recipe manually.",
  scan: "Enter ingredients manually instead.",
  labelScan: "Add the product manually from the library.",
  photoRestock: "Try barcode scan or pick from library.",
  explain: "Follow the step text as written.",
  image: "Recipes work fine without a photo.",
} as const;

import type { AiProvider } from "@/lib/db/schema";

export type AiErrorCode =
  | "not_configured"
  | "invalid_key"
  | "rate_limit"
  | "network"
  | "timeout"
  | "parse_failed"
  | "model_not_found"
  | "provider_error";

export type AiErrorKind =
  | "NO_KEY"
  | "PROVIDER_DOWN"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "BAD_RESPONSE"
  | "MODEL_NOT_FOUND";

export class AiProviderError extends Error {
  readonly code: AiErrorCode;
  readonly provider: AiProvider;
  readonly retryable: boolean;

  constructor(
    code: AiErrorCode,
    message: string,
    provider: AiProvider,
    options?: { retryable?: boolean; cause?: unknown },
  ) {
    super(message, options?.cause != null ? { cause: options.cause } : undefined);
    this.name = "AiProviderError";
    this.code = code;
    this.provider = provider;
    this.retryable =
      options?.retryable ??
      (code === "rate_limit" ||
        code === "network" ||
        code === "timeout" ||
        code === "parse_failed");
  }
}

const KIND_MESSAGES: Record<AiErrorKind, string> = {
  NO_KEY: "No API key set — add one in Settings.",
  PROVIDER_DOWN: "Couldn't reach the AI — check it's running.",
  RATE_LIMITED: "Rate limited — wait a moment and retry.",
  TIMEOUT: "Request timed out — try again.",
  BAD_RESPONSE: "AI returned an unreadable response — retry.",
  MODEL_NOT_FOUND: "Model not found — pick another in Settings.",
};

export function aiErrorKind(error: unknown): AiErrorKind {
  if (error instanceof AiProviderError) {
    switch (error.code) {
      case "not_configured":
      case "invalid_key":
        return "NO_KEY";
      case "rate_limit":
        return "RATE_LIMITED";
      case "timeout":
        return "TIMEOUT";
      case "parse_failed":
        return "BAD_RESPONSE";
      case "model_not_found":
        return "MODEL_NOT_FOUND";
      case "network":
      case "provider_error":
        return "PROVIDER_DOWN";
      default:
        return "PROVIDER_DOWN";
    }
  }
  return "PROVIDER_DOWN";
}

export function aiErrorMessage(error: unknown): string {
  if (error instanceof AiProviderError) return error.message;
  if (error instanceof Error) {
    return error.message || KIND_MESSAGES[aiErrorKind(error)];
  }
  return "AI request failed";
}

export function aiErrorStatus(error: unknown): number {
  if (error instanceof AiProviderError) {
    switch (error.code) {
      case "not_configured":
      case "invalid_key":
      case "model_not_found":
        return 400;
      case "rate_limit":
        return 429;
      case "timeout":
      case "network":
      case "provider_error":
      case "parse_failed":
        return 503;
      default:
        return 503;
    }
  }
  return 503;
}

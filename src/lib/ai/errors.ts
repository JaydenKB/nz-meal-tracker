import type { AiProvider } from "@/lib/db/schema";

export type AiErrorCode =
  | "not_configured"
  | "invalid_key"
  | "rate_limit"
  | "network"
  | "parse_failed"
  | "provider_error";

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
    this.retryable = options?.retryable ?? (code === "rate_limit" || code === "network");
  }
}

export function aiErrorMessage(error: unknown): string {
  if (error instanceof AiProviderError) return error.message;
  if (error instanceof Error) return error.message;
  return "AI request failed";
}

export function aiErrorStatus(error: unknown): number {
  if (error instanceof AiProviderError) {
    switch (error.code) {
      case "not_configured":
      case "invalid_key":
        return 400;
      case "rate_limit":
        return 429;
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

import type { AppSettings, AiProvider } from "@/lib/db/schema";
import { AiProviderError } from "@/lib/ai/errors";

export function resolveOpenAIApiKey(settings: AppSettings): string | null {
  const fromDb = settings.openaiApiKey?.trim();
  if (fromDb) return fromDb;

  const fromEnv = process.env.OPENAI_API_KEY?.trim();
  if (!fromEnv) return null;

  return fromEnv.replace(/^["']|["']$/g, "");
}

export function resolveAnthropicApiKey(settings: AppSettings): string | null {
  const fromDb = settings.anthropicApiKey?.trim();
  if (fromDb) return fromDb;

  const fromEnv = process.env.ANTHROPIC_API_KEY?.trim();
  if (!fromEnv) return null;

  return fromEnv.replace(/^["']|["']$/g, "");
}

export function isOpenAIConfigured(settings: AppSettings): boolean {
  return Boolean(resolveOpenAIApiKey(settings));
}

export function isAnthropicConfigured(settings: AppSettings): boolean {
  return Boolean(resolveAnthropicApiKey(settings));
}

export function isProviderConfigured(settings: AppSettings, provider: AiProvider): boolean {
  switch (provider) {
    case "openai":
      return isOpenAIConfigured(settings);
    case "anthropic":
      return isAnthropicConfigured(settings);
    case "local":
      return true;
    default:
      return false;
  }
}

/** Active provider when configured; falls back to local for vision/OCR if external key missing. */
export function effectiveAiProvider(settings: AppSettings): AiProvider {
  const choice = settings.aiProvider as AiProvider;
  if (choice === "openai" && isOpenAIConfigured(settings)) return "openai";
  if (choice === "anthropic" && isAnthropicConfigured(settings)) return "anthropic";
  return "local";
}

/** Validates user's chosen provider is ready — throws if not (no silent fallback). */
export function assertProviderConfigured(settings: AppSettings): AiProvider {
  const choice = settings.aiProvider as AiProvider;

  if (choice === "local") return "local";

  if (choice === "openai") {
    if (!isOpenAIConfigured(settings)) {
      throw new AiProviderError(
        "not_configured",
        "OpenAI API key not set — paste a key in Settings or add OPENAI_API_KEY to .env.local, then restart the dev server",
        "openai",
      );
    }
    return "openai";
  }

  if (choice === "anthropic") {
    if (!isAnthropicConfigured(settings)) {
      throw new AiProviderError(
        "not_configured",
        "Anthropic API key not set — paste a key in Settings or add ANTHROPIC_API_KEY to .env.local, then restart the dev server",
        "anthropic",
      );
    }
    return "anthropic";
  }

  return "local";
}

export function maskApiKey(key: string | null | undefined): {
  configured: boolean;
  preview: string | null;
} {
  if (!key?.trim()) return { configured: false, preview: null };
  const k = key.trim();
  if (k.length <= 8) return { configured: true, preview: "••••••••" };
  return { configured: true, preview: `${k.slice(0, 7)}…${k.slice(-4)}` };
}

export function sanitizeSettingsForClient(settings: AppSettings) {
  const openaiKey = resolveOpenAIApiKey(settings);
  const anthropicKey = resolveAnthropicApiKey(settings);
  const openaiMasked = maskApiKey(openaiKey);
  const anthropicMasked = maskApiKey(anthropicKey);
  const { openaiApiKey: _o, anthropicApiKey: _a, ...rest } = settings;
  return {
    ...rest,
    openaiApiKeyConfigured: openaiMasked.configured,
    openaiApiKeyPreview: openaiMasked.preview,
    anthropicApiKeyConfigured: anthropicMasked.configured,
    anthropicApiKeyPreview: anthropicMasked.preview,
  };
}

export function isNewApiKeyValue(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes("…") || trimmed.startsWith("••••")) return false;
  return true;
}

export function providerDisplayName(provider: AiProvider): string {
  switch (provider) {
    case "openai":
      return "OpenAI";
    case "anthropic":
      return "Anthropic";
    default:
      return "Local (Ollama)";
  }
}

export function providerTradeoff(provider: AiProvider): string {
  switch (provider) {
    case "local":
      return "Private and free on your LAN — quality depends on your local model and hardware.";
    case "openai":
      return "More creative recipes, billed per request. Your ingredient list and preferences are sent to OpenAI (not personal identity data).";
    case "anthropic":
      return "Strong recipe writing, billed per request. Your ingredient list and preferences are sent to Anthropic (not personal identity data).";
    default:
      return "";
  }
}

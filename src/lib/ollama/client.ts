const VISION_TIMEOUT_MS = 300_000;
export const TEXT_GENERATION_TIMEOUT_MS = 300_000;

/** Keep models in VRAM between requests (avoids reload delay). */
export const OLLAMA_KEEP_ALIVE = "30m";

export const VISION_MODEL_PRESETS = [
  { id: "qwen2.5vl:3b", label: "Qwen2.5-VL 3B", hint: "Faster · good for screenshots" },
  { id: "qwen2.5vl:7b", label: "Qwen2.5-VL 7B", hint: "Slower · more accurate OCR" },
] as const;

export function filterVisionModels(installed: string[]): string[] {
  const visionLike = installed.filter(
    (m) =>
      /vl|vision|llava|moondream|minicpm-v/i.test(m) ||
      VISION_MODEL_PRESETS.some((p) => m === p.id || m.startsWith(p.id.split(":")[0])),
  );
  return visionLike.length > 0 ? visionLike : installed;
}

export async function listOllamaModels(baseUrl: string): Promise<string[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/tags`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Ollama tags returned ${res.status}`);
  const data = (await res.json()) as { models?: { name: string }[] };
  return (data.models ?? []).map((m) => m.name);
}

export function modelIsAvailable(available: string[], model: string): boolean {
  if (available.includes(model)) return true;
  // Untagged name (e.g. "qwen2.5") may match any installed variant of that family.
  if (!model.includes(":")) {
    return available.some((m) => m === model || m.startsWith(`${model}:`));
  }
  return false;
}

export function filterTextModels(installed: string[]): string[] {
  const text = installed.filter((m) => !/vl|vision|llava|moondream|minicpm-v/i.test(m));
  return text.length > 0 ? text : installed;
}

/** Qwen3 / Qwen3.5 etc. use thinking tokens; must pass think:false or response is empty. */
export function modelUsesThinking(model: string): boolean {
  const base = model.split(":")[0].toLowerCase();
  return /qwen3|deepseek-r1|magistral|glm-z1|gpt-oss/i.test(base);
}

type OllamaGeneratePayload = {
  response?: string;
  thinking?: string;
  done_reason?: string;
};

export function extractOllamaGenerateText(data: OllamaGeneratePayload): string {
  return data.response?.trim() ?? "";
}

export async function ollamaGenerateText(
  baseUrl: string,
  model: string,
  prompt: string,
  options?: { formatJson?: boolean; timeoutMs?: number; temperature?: number; top_p?: number },
): Promise<string> {
  await assertOllamaModel(baseUrl, model);

  const url = `${baseUrl.replace(/\/$/, "")}/api/generate`;
  const body: Record<string, unknown> = {
    model,
    prompt,
    stream: false,
    keep_alive: OLLAMA_KEEP_ALIVE,
    options: {
      num_predict: 4096,
      temperature: options?.temperature ?? 0.85,
      top_p: options?.top_p ?? 0.9,
    },
  };

  if (options?.formatJson !== false) {
    body.format = "json";
  }

  if (modelUsesThinking(model)) {
    body.think = false;
  }

  let res: Response;
  try {
    res = await ollamaFetch(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      options?.timeoutMs ?? TEXT_GENERATION_TIMEOUT_MS,
    );
  } catch (error) {
    throw connectionError(baseUrl, error);
  }

  if (!res.ok) {
    throw await parseOllamaHttpError(res, baseUrl, model);
  }

  const data = (await res.json()) as OllamaGeneratePayload;
  const text = extractOllamaGenerateText(data);

  if (!text) {
    const hint = modelUsesThinking(model)
      ? ""
      : " Try a different text model in Settings (e.g. qwen2.5:7b).";
    throw new Error(
      `Empty response from Ollama (${model}). The model may have run out of tokens or hit a timeout.${hint}`,
    );
  }

  return text;
}

export async function assertOllamaModel(baseUrl: string, model: string): Promise<void> {
  try {
    const models = await listOllamaModels(baseUrl);
    if (modelIsAvailable(models, model)) return;
    throw new Error(
      `Model "${model}" is not installed. In a terminal run: ollama pull ${model}`,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("not installed")) throw error;
    throw connectionError(baseUrl, error);
  }
}

export function connectionError(baseUrl: string, cause?: unknown): Error {
  const detail =
    cause instanceof Error && cause.message.includes("fetch failed")
      ? " (connection refused)"
      : cause instanceof Error
        ? `: ${cause.message}`
        : "";
  return new Error(
    `Cannot reach Ollama at ${baseUrl}${detail}. Open the Ollama app or run "ollama serve" on this PC.`,
  );
}

export async function parseOllamaHttpError(
  res: Response,
  baseUrl: string,
  model: string,
): Promise<Error> {
  let body = "";
  try {
    body = await res.text();
  } catch {
    /* ignore */
  }

  const lower = body.toLowerCase();

  if (res.status === 404 || lower.includes("not found")) {
    return new Error(
      `Model "${model}" is not installed. Settings → pick an installed model, or run: ollama pull ${model}`,
    );
  }

  if (res.status === 503 || lower.includes("loading model")) {
    return new Error("Ollama is loading the model — wait a moment and try again.");
  }

  return new Error(
    body.trim() ||
      `Ollama error ${res.status} at ${baseUrl}. Check the Ollama app is running.`,
  );
}

export async function ollamaFetch(
  url: string,
  init: RequestInit,
  timeoutMs = VISION_TIMEOUT_MS,
): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

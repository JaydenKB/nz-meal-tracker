"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Pill } from "@/components/ui/pill";
import { OPENAI_TEXT_MODELS, OPENAI_VISION_MODELS } from "@/lib/openai/client";
import { ANTHROPIC_TEXT_MODELS } from "@/lib/anthropic/client";
import { providerTradeoff } from "@/lib/ai/settings";
import type { AiProvider } from "@/lib/db/schema";
import { sfxEnabled, setSfxEnabled } from "@/lib/sfx";
import { SfxPreview } from "@/components/settings/sfx-preview";

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h2>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)]">
        {children}
      </div>
    </section>
  );
}

function RowLink({
  label,
  value,
  href,
}: {
  label: string;
  value?: string;
  href?: string;
}) {
  const inner = (
    <>
      <span className="text-sm font-normal text-[var(--foreground)]">{label}</span>
      <div className="flex items-center gap-2">
        {value && (
          <span className="max-w-[140px] truncate text-sm font-normal text-[var(--muted)]">
            {value}
          </span>
        )}
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" strokeWidth={1.75} />
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex w-full items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3.5 last:border-b-0"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex w-full items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3.5 last:border-b-0">
      {inner}
    </div>
  );
}

export function SettingsForm({ layout = "default" }: { layout?: "default" | "grouped" }) {
  const [goals, setGoals] = useState({
    calorieTarget: 1800,
    proteinTargetG: 150,
    fatTargetG: 65,
    carbTargetG: 200,
  });
  const [settings, setSettings] = useState({
    ollamaBaseUrl: "http://localhost:11434",
    ollamaModel: "qwen2.5:7b",
    ollamaVisionModel: "qwen2.5vl:3b",
    aiProvider: "local" as AiProvider,
    openaiTextModel: "gpt-4o-mini",
    openaiVisionModel: "gpt-4o",
    openaiApiKeyConfigured: false,
    openaiApiKeyPreview: null as string | null,
    anthropicTextModel: "claude-sonnet-4-20250514",
    anthropicApiKeyConfigured: false,
    anthropicApiKeyPreview: null as string | null,
  });
  const [openaiApiKeyInput, setOpenaiApiKeyInput] = useState("");
  const [anthropicApiKeyInput, setAnthropicApiKeyInput] = useState("");
  const [openaiOk, setOpenaiOk] = useState<boolean | null>(null);
  const [openaiError, setOpenaiError] = useState<string | null>(null);
  const [anthropicOk, setAnthropicOk] = useState<boolean | null>(null);
  const [anthropicError, setAnthropicError] = useState<string | null>(null);
  const [testingOpenai, setTestingOpenai] = useState(false);
  const [testingAnthropic, setTestingAnthropic] = useState(false);
  const [textOptions, setTextOptions] = useState<string[]>(["qwen2.5:7b", "qwen3.5:2b"]);
  const [visionOptions, setVisionOptions] = useState<string[]>([
    "qwen2.5vl:3b",
    "qwen2.5vl:7b",
  ]);
  const [textReady, setTextReady] = useState<boolean | null>(null);
  const [visionReady, setVisionReady] = useState<boolean | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [showGoals, setShowGoals] = useState(false);
  const [showAi, setShowAi] = useState<string | null>(null);
  const [warming, setWarming] = useState(false);
  const [warmupMsg, setWarmupMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSoundOn(sfxEnabled());
    Promise.all([
      fetch("/api/goals").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/ai/health").then((r) => r.json()),
    ]).then(([g, s, health]) => {
      setGoals(g);
      setSettings({
        ollamaBaseUrl: s.ollamaBaseUrl,
        ollamaModel: s.ollamaModel,
        ollamaVisionModel: s.ollamaVisionModel,
        aiProvider:
          s.aiProvider === "openai" || s.aiProvider === "anthropic"
            ? s.aiProvider
            : "local",
        openaiTextModel: s.openaiTextModel ?? "gpt-4o-mini",
        openaiVisionModel: s.openaiVisionModel ?? "gpt-4o",
        openaiApiKeyConfigured: Boolean(s.openaiApiKeyConfigured),
        openaiApiKeyPreview: s.openaiApiKeyPreview ?? null,
        anthropicTextModel: s.anthropicTextModel ?? "claude-sonnet-4-20250514",
        anthropicApiKeyConfigured: Boolean(s.anthropicApiKeyConfigured),
        anthropicApiKeyPreview: s.anthropicApiKeyPreview ?? null,
      });
      const ollama = health.ollama ?? {};
      if (ollama.installedModels?.length) {
        const installed = ollama.installedModels as string[];
        const text = installed.filter(
          (m) => !/vl|vision|llava|moondream|minicpm-v/i.test(m),
        );
        const vision = installed.filter((m) =>
          /vl|vision|llava|moondream|minicpm-v/i.test(m),
        );
        if (text.length > 0) setTextOptions(text);
        if (vision.length > 0) setVisionOptions(vision);
      }
      if (ollama.ok) {
        setTextReady(ollama.textModelReady ?? false);
        setVisionReady(ollama.visionModelReady ?? false);
      }
      if (health.openai) {
        setOpenaiOk(health.openai.ok ?? false);
        if (!health.openai.ok) {
          setOpenaiError(
            (health.openai.error as string | undefined) ??
              (health.openaiConfigured
                ? "Connection failed"
                : "No API key on server — add OPENAI_API_KEY to .env.local and restart the dev server"),
          );
        }
      }
      if (health.anthropic) {
        setAnthropicOk(health.anthropic.ok ?? false);
        if (!health.anthropic.ok) {
          setAnthropicError(
            (health.anthropic.error as string | undefined) ??
              (health.anthropicConfigured
                ? "Connection failed"
                : "No API key on server — add ANTHROPIC_API_KEY to .env.local and restart the dev server"),
          );
        }
      }
    });
  }, []);

  async function handleWarmup() {
    setWarming(true);
    setWarmupMsg(null);
    try {
      const res = await fetch("/api/ollama/warmup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Warmup failed");
      const loaded = (data.loaded as string[]).join(", ");
      const failed = data.errors?.length
        ? ` Failed: ${(data.errors as string[]).join("; ")}`
        : "";
      setWarmupMsg(`Loaded: ${loaded}${failed}`);
    } catch (e) {
      setWarmupMsg(e instanceof Error ? e.message : "Warmup failed");
    } finally {
      setWarming(false);
    }
  }

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    const settingsBody: Record<string, unknown> = { ...settings };
    delete settingsBody.openaiApiKeyConfigured;
    delete settingsBody.openaiApiKeyPreview;
    delete settingsBody.anthropicApiKeyConfigured;
    delete settingsBody.anthropicApiKeyPreview;
    if (openaiApiKeyInput.trim()) {
      settingsBody.openaiApiKey = openaiApiKeyInput.trim();
    }
    if (anthropicApiKeyInput.trim()) {
      settingsBody.anthropicApiKey = anthropicApiKeyInput.trim();
    }

    await Promise.all([
      fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goals),
      }),
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsBody),
      }),
    ]);
    setOpenaiApiKeyInput("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    fetch("/api/ai/health")
      .then((r) => r.json())
      .then((health) => setOpenaiOk(health.openai?.ok ?? false));
  }

  async function handleTestOpenAI() {
    setTestingOpenai(true);
    setOpenaiError(null);
    try {
      if (openaiApiKeyInput.trim()) {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...settings,
            openaiApiKey: openaiApiKeyInput.trim(),
            aiProvider: "openai",
          }),
        });
        setOpenaiApiKeyInput("");
      }
      const res = await fetch("/api/ai/health");
      const health = await res.json();
      setOpenaiOk(health.openai?.ok ?? false);
      if (health.openai?.ok) {
        setOpenaiError(null);
      } else if (!health.openaiConfigured && !openaiApiKeyInput.trim()) {
        setOpenaiError(
          "No API key on server — add OPENAI_API_KEY to .env.local and restart the dev server",
        );
      } else {
        setOpenaiError(
          (health.openai?.error as string | undefined) ??
            "Could not reach OpenAI — check your key and billing",
        );
      }
    } finally {
      setTestingOpenai(false);
    }
  }

  async function handleTestAnthropic() {
    setTestingAnthropic(true);
    setAnthropicError(null);
    try {
      if (anthropicApiKeyInput.trim()) {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...settings,
            anthropicApiKey: anthropicApiKeyInput.trim(),
            aiProvider: "anthropic",
          }),
        });
        setAnthropicApiKeyInput("");
      }
      const res = await fetch("/api/ai/health");
      const health = await res.json();
      setAnthropicOk(health.anthropic?.ok ?? false);
      if (health.anthropic?.ok) {
        setAnthropicError(null);
      } else if (!health.anthropicConfigured && !anthropicApiKeyInput.trim()) {
        setAnthropicError(
          "No API key on server — add ANTHROPIC_API_KEY to .env.local and restart the dev server",
        );
      } else {
        setAnthropicError(
          (health.anthropic?.error as string | undefined) ??
            "Could not reach Anthropic — check your key and billing",
        );
      }
    } finally {
      setTestingAnthropic(false);
    }
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSfxEnabled(next);
  }

  if (layout === "grouped") {
    return (
      <form onSubmit={handleSave} className="space-y-5">
        <SettingsSection title="AI provider">
          <div className="flex flex-wrap gap-2 border-b border-[var(--border)] bg-white p-3">
            <Pill
              active={settings.aiProvider === "local"}
              onClick={() => setSettings({ ...settings, aiProvider: "local" })}
              className="flex-1 min-w-[90px]"
            >
              Local
            </Pill>
            <Pill
              active={settings.aiProvider === "openai"}
              variant="ai"
              onClick={() => setSettings({ ...settings, aiProvider: "openai" })}
              className="flex-1 min-w-[90px]"
            >
              OpenAI
            </Pill>
            <Pill
              active={settings.aiProvider === "anthropic"}
              variant="ai"
              onClick={() => setSettings({ ...settings, aiProvider: "anthropic" })}
              className="flex-1 min-w-[90px]"
            >
              Claude
            </Pill>
          </div>
          <p className="border-b border-[var(--border)] bg-[var(--beige)] px-4 py-3 text-xs leading-relaxed text-[var(--muted)]">
            {providerTradeoff(settings.aiProvider)}
          </p>

          {settings.aiProvider === "openai" ? (
            <div className="space-y-0">
              <div className="border-b border-[var(--border)] bg-white px-4 py-3.5">
                <Label className="text-xs text-[var(--muted)]">API key</Label>
                <Input
                  type="password"
                  autoComplete="off"
                  placeholder={
                    settings.openaiApiKeyConfigured
                      ? settings.openaiApiKeyPreview ?? "Key saved — paste to replace"
                      : "sk-…"
                  }
                  value={openaiApiKeyInput}
                  onChange={(e) => setOpenaiApiKeyInput(e.target.value)}
                  className="mt-1.5 bg-white"
                />
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Get a key at{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[var(--ai)] underline"
                  >
                    platform.openai.com/api-keys
                  </a>
                  . Paste it here, or set{" "}
                  <code className="rounded bg-[var(--beige)] px-1">OPENAI_API_KEY</code> in{" "}
                  <code className="rounded bg-[var(--beige)] px-1">.env.local</code> and restart
                  the dev server.
                </p>
                <Button
                  type="button"
                  variant="ai"
                  size="sm"
                  className="mt-2 w-full"
                  disabled={testingOpenai}
                  onClick={handleTestOpenAI}
                >
                  {testingOpenai ? "Testing…" : "Test connection"}
                </Button>
                {openaiOk === true && (
                  <p className="mt-2 text-xs text-[var(--success)]">OpenAI connected</p>
                )}
                {openaiOk === false && openaiError && (
                  <p className="mt-2 text-xs text-red-600">{openaiError}</p>
                )}
              </div>
              <div className="border-b border-[var(--border)] bg-white px-4 py-3.5">
                <Label className="text-xs text-[var(--muted)]">Text model</Label>
                <Select
                  value={settings.openaiTextModel}
                  onChange={(e) =>
                    setSettings({ ...settings, openaiTextModel: e.target.value })
                  }
                  className="mt-1.5 bg-white"
                >
                  {OPENAI_TEXT_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} · {m.hint}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="bg-white px-4 py-3.5">
                <Label className="text-xs text-[var(--muted)]">Vision / OCR</Label>
                <Select
                  value={settings.openaiVisionModel}
                  onChange={(e) =>
                    setSettings({ ...settings, openaiVisionModel: e.target.value })
                  }
                  className="mt-1.5 bg-white"
                >
                  {OPENAI_VISION_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} · {m.hint}
                    </option>
                  ))}
                </Select>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Also powers recipe photo generation (DALL·E 3).
                </p>
              </div>
            </div>
          ) : settings.aiProvider === "anthropic" ? (
            <div className="space-y-0">
              <div className="border-b border-[var(--border)] bg-white px-4 py-3.5">
                <Label className="text-xs text-[var(--muted)]">API key</Label>
                <Input
                  type="password"
                  autoComplete="off"
                  placeholder={
                    settings.anthropicApiKeyConfigured
                      ? settings.anthropicApiKeyPreview ?? "Key saved — paste to replace"
                      : "sk-ant-…"
                  }
                  value={anthropicApiKeyInput}
                  onChange={(e) => setAnthropicApiKeyInput(e.target.value)}
                  className="mt-1.5 bg-white"
                />
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Get a key at{" "}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[var(--ai)] underline"
                  >
                    console.anthropic.com
                  </a>
                  . Or set{" "}
                  <code className="rounded bg-[var(--beige)] px-1">ANTHROPIC_API_KEY</code> in{" "}
                  <code className="rounded bg-[var(--beige)] px-1">.env.local</code>.
                </p>
                <Button
                  type="button"
                  variant="ai"
                  size="sm"
                  className="mt-2 w-full"
                  disabled={testingAnthropic}
                  onClick={handleTestAnthropic}
                >
                  {testingAnthropic ? "Testing…" : "Test connection"}
                </Button>
                {anthropicOk === true && (
                  <p className="mt-2 text-xs text-[var(--success)]">Anthropic connected</p>
                )}
                {anthropicOk === false && anthropicError && (
                  <p className="mt-2 text-xs text-red-600">{anthropicError}</p>
                )}
              </div>
              <div className="bg-white px-4 py-3.5">
                <Label className="text-xs text-[var(--muted)]">Text model</Label>
                <Select
                  value={settings.anthropicTextModel}
                  onChange={(e) =>
                    setSettings({ ...settings, anthropicTextModel: e.target.value })
                  }
                  className="mt-1.5 bg-white"
                >
                  {ANTHROPIC_TEXT_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} · {m.hint}
                    </option>
                  ))}
                </Select>
                <Input
                  value={settings.anthropicTextModel}
                  onChange={(e) =>
                    setSettings({ ...settings, anthropicTextModel: e.target.value })
                  }
                  placeholder="Or type a model ID from Anthropic docs"
                  className="mt-2 bg-white text-xs"
                />
              </div>
            </div>
          ) : (
            <>
          <button
            type="button"
            onClick={() => setShowAi(showAi === "text" ? null : "text")}
            className="flex w-full items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3.5"
          >
            <span className="text-sm text-[var(--foreground)]">Text model</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--muted)]">{settings.ollamaModel}</span>
              <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
            </div>
          </button>
          {showAi === "text" && (
            <div className="border-b border-[var(--border)] bg-[var(--beige)] p-4">
              <Select
                value={settings.ollamaModel}
                onChange={(e) =>
                  setSettings({ ...settings, ollamaModel: e.target.value })
                }
                className="bg-white"
              >
                {textOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
              {textReady === false && (
                <p className="mt-2 text-xs text-[var(--muted)]">Model not installed.</p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowAi(showAi === "vision" ? null : "vision")}
            className="flex w-full items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3.5"
          >
            <span className="text-sm text-[var(--foreground)]">Vision / OCR</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--muted)]">{settings.ollamaVisionModel}</span>
              <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
            </div>
          </button>
          {showAi === "vision" && (
            <div className="border-b border-[var(--border)] bg-[var(--beige)] p-4 space-y-2">
              <Select
                value={settings.ollamaVisionModel}
                onChange={(e) =>
                  setSettings({ ...settings, ollamaVisionModel: e.target.value })
                }
                className="bg-white"
              >
                {visionOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
              {visionReady === false && (
                <p className="text-xs text-[var(--muted)]">Model not installed.</p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowAi(showAi === "url" ? null : "url")}
            className="flex w-full items-center justify-between bg-white px-4 py-3.5"
          >
            <span className="text-sm text-[var(--foreground)]">Ollama URL</span>
            <div className="flex items-center gap-2">
              <span className="max-w-[120px] truncate text-sm text-[var(--muted)]">
                {settings.ollamaBaseUrl.replace(/^https?:\/\//, "")}
              </span>
              <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
            </div>
          </button>
          {showAi === "url" && (
            <div className="bg-[var(--beige)] p-4">
              <Input
                value={settings.ollamaBaseUrl}
                onChange={(e) =>
                  setSettings({ ...settings, ollamaBaseUrl: e.target.value })
                }
                className="bg-white"
              />
              <Button
                type="button"
                variant="secondary"
                className="mt-2 w-full"
                disabled={warming}
                onClick={handleWarmup}
              >
                {warming ? "Loading…" : "Preload AI models"}
              </Button>
              {warmupMsg && (
                <p className="mt-2 text-xs text-[var(--primary)]">{warmupMsg}</p>
              )}
            </div>
          )}
            </>
          )}
        </SettingsSection>

        <SettingsSection title="Preferences">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3.5">
            <span className="text-sm text-[var(--foreground)]">Sound effects</span>
            <ToggleSwitch
              checked={soundOn}
              onChange={toggleSound}
              label="Sound effects"
            />
          </div>
          <SfxPreview enabled={soundOn} />
          <button
            type="button"
            onClick={() => setShowGoals(!showGoals)}
            className="flex w-full items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3.5"
          >
            <span className="text-sm text-[var(--foreground)]">Daily goals</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--muted)]">{goals.calorieTarget} kcal</span>
              <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
            </div>
          </button>
          {showGoals && (
            <div className="grid grid-cols-2 gap-3 bg-[var(--beige)] p-4">
              <div className="space-y-1">
                <Label className="text-xs">Calories</Label>
                <Input
                  type="number"
                  value={goals.calorieTarget}
                  onChange={(e) =>
                    setGoals({ ...goals, calorieTarget: Number(e.target.value) })
                  }
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Protein (g)</Label>
                <Input
                  type="number"
                  value={goals.proteinTargetG}
                  onChange={(e) =>
                    setGoals({ ...goals, proteinTargetG: Number(e.target.value) })
                  }
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fat (g)</Label>
                <Input
                  type="number"
                  value={goals.fatTargetG}
                  onChange={(e) =>
                    setGoals({ ...goals, fatTargetG: Number(e.target.value) })
                  }
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Carbs (g)</Label>
                <Input
                  type="number"
                  value={goals.carbTargetG}
                  onChange={(e) =>
                    setGoals({ ...goals, carbTargetG: Number(e.target.value) })
                  }
                  className="bg-white"
                />
              </div>
            </div>
          )}
          <RowLink label="Theme" value="Light" />
        </SettingsSection>

        <Button type="submit" size="lg" className="w-full">
          {saved ? "Saved!" : "Save settings"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <section className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border)] p-4">
        <h2 className="font-medium">Daily goals</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Calories</Label>
            <Input
              type="number"
              value={goals.calorieTarget}
              onChange={(e) => setGoals({ ...goals, calorieTarget: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Protein (g)</Label>
            <Input
              type="number"
              value={goals.proteinTargetG}
              onChange={(e) => setGoals({ ...goals, proteinTargetG: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Fat (g)</Label>
            <Input
              type="number"
              value={goals.fatTargetG}
              onChange={(e) => setGoals({ ...goals, fatTargetG: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Carbs (g)</Label>
            <Input
              type="number"
              value={goals.carbTargetG}
              onChange={(e) => setGoals({ ...goals, carbTargetG: Number(e.target.value) })}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border)] p-4">
        <h2 className="font-medium">Local LLM (Ollama)</h2>
        <div className="space-y-2">
          <Label>Base URL</Label>
          <Input
            value={settings.ollamaBaseUrl}
            onChange={(e) => setSettings({ ...settings, ollamaBaseUrl: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Text model</Label>
          <Select
            value={settings.ollamaModel}
            onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
          >
            {textOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Vision model</Label>
          <Select
            value={settings.ollamaVisionModel}
            onChange={(e) =>
              setSettings({ ...settings, ollamaVisionModel: e.target.value })
            }
          >
            {visionOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={warming}
            onClick={handleWarmup}
          >
            {warming ? "Loading models…" : "Preload AI models"}
          </Button>
          {warmupMsg && <p className="text-xs text-[var(--primary)]">{warmupMsg}</p>}
        </div>
      </section>

      <Button type="submit" size="lg" className="w-full">
        {saved ? "Saved!" : "Save settings"}
      </Button>
    </form>
  );
}

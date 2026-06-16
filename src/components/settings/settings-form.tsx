"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsForm() {
  const [goals, setGoals] = useState({
    calorieTarget: 1800,
    proteinTargetG: 150,
    fatTargetG: 65,
    carbTargetG: 200,
  });
  const [settings, setSettings] = useState({
    ollamaBaseUrl: "http://localhost:11434",
    ollamaModel: "qwen2.5",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/goals").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([g, s]) => {
      setGoals(g);
      setSettings(s);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await Promise.all([
      fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goals),
      }),
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      }),
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
        <h2 className="font-semibold">Daily goals</h2>
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

      <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
        <h2 className="font-semibold">Local LLM (Ollama)</h2>
        <div className="space-y-2">
          <Label>Base URL</Label>
          <Input
            value={settings.ollamaBaseUrl}
            onChange={(e) => setSettings({ ...settings, ollamaBaseUrl: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Model</Label>
          <Input
            value={settings.ollamaModel}
            onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
          />
        </div>
      </section>

      <Button type="submit" size="lg" className="w-full">
        {saved ? "Saved!" : "Save settings"}
      </Button>
    </form>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { CalorieRing } from "@/components/today/calorie-ring";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRecipeAccent } from "@/lib/theme";
import { MEAL_LABELS, MEAL_ORDER, shiftDate, todayString } from "@/lib/log/compute";
import type { MealType } from "@/lib/db/schema";

type LogData = {
  date: string;
  dateLabel: string;
  entries: {
    id: number;
    mealType: MealType;
    name: string;
    servings: number;
    macros: { calories: number };
    accentIndex: number;
  }[];
  totals: { calories: number; proteinG: number; fatG: number; carbsG: number };
  goals: { calorieTarget: number; proteinTargetG: number; fatTargetG: number; carbTargetG: number };
  remaining: { calories: number };
};

type PickerItem = { id: number; name: string; type: "recipe" | "ingredient" };

export function TodayPageClient() {
  const [date, setDate] = useState(todayString());
  const [data, setData] = useState<LogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [recipes, setRecipes] = useState<PickerItem[]>([]);
  const [ingredients, setIngredients] = useState<PickerItem[]>([]);
  const [pickerType, setPickerType] = useState<"recipe" | "ingredient">("recipe");
  const [selectedId, setSelectedId] = useState("");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [servings, setServings] = useState("1");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/log?date=${date}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!showModal) return;
    Promise.all([
      fetch("/api/recipes-list").then((r) => r.json()).catch(() => ({ recipes: [] })),
      fetch("/api/ingredients-list").then((r) => r.json()).catch(() => ({ ingredients: [] })),
    ]).then(([r, i]) => {
      setRecipes(r.recipes ?? []);
      setIngredients(i.ingredients ?? []);
    });
  }, [showModal]);

  async function handleLog() {
    const body: Record<string, unknown> = {
      date,
      mealType,
      servings: Number(servings) || 1,
    };
    if (pickerType === "recipe") body.recipeId = Number(selectedId);
    else body.ingredientId = Number(selectedId);

    await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setShowModal(false);
    setSelectedId("");
    load();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/log/${id}`, { method: "DELETE" });
    load();
  }

  const grouped = MEAL_ORDER.map((mt) => ({
    mealType: mt,
    label: MEAL_LABELS[mt],
    entries: data?.entries.filter((e) => e.mealType === mt) ?? [],
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[1.65rem] font-bold">{data?.dateLabel ?? "Today"}</h1>
          <p className="text-sm text-[var(--muted)]">
            {new Date(date + "T12:00:00").toLocaleDateString("en-NZ", {
              weekday: "short",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, -1))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)]"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)]"
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--green-soft)] p-6 text-center text-sm text-[var(--muted)]">
          Loading…
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 rounded-[var(--radius-lg)] bg-[var(--green-soft)] p-4">
            <CalorieRing consumed={data.totals.calories} target={data.goals.calorieTarget} />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--primary)]">
                {data.remaining.calories} kcal remaining
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="font-bold">{Math.round(data.totals.proteinG)}g</p>
                  <p className="text-[var(--muted)]">protein</p>
                </div>
                <div>
                  <p className="font-bold">{Math.round(data.totals.fatG)}g</p>
                  <p className="text-[var(--muted)]">fat</p>
                </div>
                <div>
                  <p className="font-bold">{Math.round(data.totals.carbsG)}g</p>
                  <p className="text-[var(--muted)]">carbs</p>
                </div>
              </div>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-base font-semibold">Logged meals</h2>
            {data.entries.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Nothing logged yet today.</p>
            ) : (
              grouped.map(
                (group) =>
                  group.entries.length > 0 && (
                    <div key={group.mealType} className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {group.label}
                      </p>
                      {group.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] px-3.5 py-3"
                          onTouchStart={() => {
                            longPressTimer.current = setTimeout(() => {
                              if (confirm(`Remove ${entry.name}?`)) handleDelete(entry.id);
                            }, 600);
                          }}
                          onTouchEnd={() => {
                            if (longPressTimer.current) clearTimeout(longPressTimer.current);
                          }}
                        >
                          <div
                            className="h-10 w-10 shrink-0 rounded-xl"
                            style={{ backgroundColor: getRecipeAccent(entry.accentIndex) }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-sm">{entry.name}</p>
                            <p className="text-xs text-[var(--muted)]">
                              {group.label} · {entry.servings} serving{entry.servings === 1 ? "" : "s"}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold">
                            {Math.round(entry.macros.calories)} kcal
                          </p>
                        </div>
                      ))}
                    </div>
                  ),
              )
            )}
          </section>
        </>
      )}

      <Button size="lg" className="w-full" onClick={() => setShowModal(true)}>
        <Plus className="h-5 w-5" />
        Log a meal
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-[430px] rounded-t-[var(--radius-lg)] bg-white p-5 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Log a meal</h3>
              <button type="button" onClick={() => setShowModal(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                {(["recipe", "ingredient"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setPickerType(t);
                      setSelectedId("");
                    }}
                    className={`flex-1 rounded-[var(--radius)] py-2 text-sm font-medium ${
                      pickerType === t
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--beige)] text-[var(--foreground)]"
                    }`}
                  >
                    {t === "recipe" ? "Recipe" : "Ingredient"}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Choose {pickerType}</Label>
                <Select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  <option value="" disabled>Select…</option>
                  {(pickerType === "recipe" ? recipes : ingredients).map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Meal</Label>
                  <Select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as MealType)}
                  >
                    {MEAL_ORDER.map((m) => (
                      <option key={m} value={m}>{MEAL_LABELS[m]}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Servings</Label>
                  <Input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!selectedId}
                onClick={handleLog}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

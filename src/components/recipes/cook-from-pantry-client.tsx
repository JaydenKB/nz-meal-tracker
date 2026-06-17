"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { RecipeIcon } from "@/components/ui/recipe-icon";
import { loadPantryReviewSession } from "@/lib/pantry/review-session";
import type { RecipePantryMatch } from "@/lib/pantry/recipe-match";

type Filter = "all" | "high_protein" | "quick";

function StatusChip({ match }: { match: RecipePantryMatch }) {
  if (match.cookability === "cook_now") {
    return (
      <span className="shrink-0 rounded-full bg-[var(--green-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--primary)]">
        all in stock
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-[var(--orange-soft)] px-2 py-0.5 text-[10px] font-medium text-[#c47a2c]">
      {match.gapCount} item{match.gapCount === 1 ? "" : "s"}
    </span>
  );
}

function RecipeRow({
  match,
  showShortfall,
  highlighted,
}: {
  match: RecipePantryMatch;
  showShortfall?: boolean;
  highlighted?: boolean;
}) {
  const href =
    match.cookability === "almost"
      ? `/recipes/${match.recipeId}/pantry`
      : `/recipes/${match.recipeId}`;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[var(--radius-card)] border px-3.5 py-3 ${
        highlighted
          ? "border-[var(--success)]/50 bg-[var(--green-soft)]"
          : "border-[var(--border)] bg-white"
      }`}
    >
      <RecipeIcon index={match.recipeId} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium text-[var(--foreground)]">{match.recipeName}</p>
          <StatusChip match={match} />
        </div>
        <p className="mt-0.5 text-sm text-[var(--muted)]">
          {Math.round(match.kcal)} kcal · score {Math.round(match.score)}
        </p>
        {showShortfall && match.shortfallSummary && (
          <p className="mt-0.5 text-xs text-[#c47a2c]">{match.shortfallSummary}</p>
        )}
      </div>
    </Link>
  );
}

function Section({
  dotColor,
  title,
  children,
  defaultOpen = true,
  collapsible = false,
}: {
  dotColor: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        type="button"
        className="mb-2 flex w-full items-center gap-2 text-left"
        onClick={() => collapsible && setOpen((o) => !o)}
        disabled={!collapsible}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
        <h2 className="flex-1 text-base font-medium text-[var(--foreground)]">{title}</h2>
        {collapsible &&
          (open ? (
            <ChevronUp className="h-4 w-4 text-[var(--muted)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
          ))}
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </section>
  );
}

export function CookFromPantryClient({
  cookNow,
  almost,
  notYet,
  pantryIngredientIds,
  highlightFresh = false,
}: {
  cookNow: RecipePantryMatch[];
  almost: RecipePantryMatch[];
  notYet: RecipePantryMatch[];
  pantryIngredientIds: number[];
  highlightFresh?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [highlightIds, setHighlightIds] = useState<number[]>([]);

  useEffect(() => {
    if (!highlightFresh) return;
    const session = loadPantryReviewSession();
    if (session.lastCookNowRecipeIds?.length) {
      setHighlightIds(session.lastCookNowRecipeIds);
    }
  }, [highlightFresh]);

  const highlightSet = useMemo(() => new Set(highlightIds), [highlightIds]);

  const applyFilter = (list: RecipePantryMatch[]) => {
    if (filter === "high_protein") return list.filter((r) => r.proteinG >= 25);
    if (filter === "quick") return list.filter((r) => r.kcal <= 450);
    return list;
  };

  const filtered = useMemo(
    () => ({
      cookNow: applyFilter(cookNow),
      almost: applyFilter(almost),
      notYet: applyFilter(notYet),
    }),
    [cookNow, almost, notYet, filter],
  );

  const freshCookNow = useMemo(
    () => filtered.cookNow.filter((m) => highlightSet.has(m.recipeId)),
    [filtered.cookNow, highlightSet],
  );

  const otherCookNow = useMemo(
    () => filtered.cookNow.filter((m) => !highlightSet.has(m.recipeId)),
    [filtered.cookNow, highlightSet],
  );

  const generateHref =
    pantryIngredientIds.length > 0
      ? `/generate?fromPantry=${pantryIngredientIds.slice(0, 12).join(",")}`
      : "/generate?fromPantry=1";

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-8">
      <header className="flex items-center gap-3">
        <Link
          href="/recipes"
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium">Cook from pantry</h1>
          <p className="text-sm text-[var(--muted)]">Ranked by what you have at home</p>
        </div>
      </header>

      <div className="flex gap-2">
        {(
          [
            ["all", "All"],
            ["high_protein", "High protein"],
            ["quick", "Quick"],
          ] as const
        ).map(([id, label]) => (
          <Pill key={id} active={filter === id} onClick={() => setFilter(id)} className="flex-1 text-xs">
            {label}
          </Pill>
        ))}
      </div>

      {highlightFresh && freshCookNow.length > 0 && (
        <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--green-soft)] px-4 py-3 text-sm">
          <p className="font-medium text-[var(--primary)]">
            {freshCookNow.length} new recipe{freshCookNow.length === 1 ? "" : "s"} you can cook now
          </p>
          <p className="mt-0.5 text-[var(--muted)]">From what you just added to pantry</p>
        </div>
      )}

      {freshCookNow.length > 0 && (
        <Section dotColor="bg-[var(--success)]" title="Newly available">
          {freshCookNow.map((m) => (
            <RecipeRow key={m.recipeId} match={m} highlighted />
          ))}
        </Section>
      )}

      {otherCookNow.length > 0 && (
        <Section dotColor="bg-[var(--success)]" title="Cook now">
          {otherCookNow.map((m) => (
            <RecipeRow key={m.recipeId} match={m} />
          ))}
        </Section>
      )}

      {filtered.almost.length > 0 && (
        <Section dotColor="bg-[var(--streak)]" title="Almost · missing 1–2">
          {filtered.almost.map((m) => (
            <RecipeRow key={m.recipeId} match={m} showShortfall />
          ))}
        </Section>
      )}

      {filtered.notYet.length > 0 && (
        <Section
          dotColor="bg-[var(--muted)]"
          title={`Not yet · ${filtered.notYet.length} recipes`}
          defaultOpen={false}
          collapsible
        >
          {filtered.notYet.map((m) => (
            <RecipeRow key={m.recipeId} match={m} showShortfall />
          ))}
        </Section>
      )}

      {filtered.cookNow.length === 0 &&
        filtered.almost.length === 0 &&
        filtered.notYet.length === 0 && (
          <p className="rounded-[var(--radius-card)] bg-[var(--beige)] px-4 py-6 text-center text-sm text-[var(--muted)]">
            No recipes match this filter. Try All or stock more pantry items.
          </p>
        )}

      <Link href={generateHref}>
        <Button variant="ai" className="w-full">
          <Sparkles className="h-4 w-4" />
          Generate an AI recipe from my pantry
        </Button>
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Barcode, Camera, ScanLine, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  appendPantryReviewLines,
  libraryItemToReviewLine,
} from "@/lib/pantry/review-session";

const METHODS = [
  {
    href: "/ingredients/barcode?from=pantry&hub=1",
    icon: Barcode,
    title: "Scan barcode",
    desc: "Fastest for packaged food",
    badge: "best",
    iconBg: "bg-[var(--ai-soft)]",
  },
  {
    href: "/shop/pantry/restock?hub=1",
    icon: Camera,
    title: "Photo of your haul",
    desc: "Many items or loose produce",
    iconBg: "bg-[var(--green-soft)]",
  },
  {
    href: "/shop/pantry/restock/create?hub=1",
    icon: ScanLine,
    title: "Scan a label",
    desc: "Create something brand new",
    iconBg: "bg-[#fef3e2]",
  },
  {
    href: "#library",
    icon: Search,
    title: "Pick from library",
    desc: "Something you already have saved",
    iconBg: "bg-[var(--beige)]",
  },
] as const;

export function PantryAddHubClient() {
  const searchParams = useSearchParams();
  const context = searchParams.get("context") ?? "pantry";
  const backHref = context === "ingredient" ? "/ingredients" : "/shop/pantry";
  const title = context === "ingredient" ? "Add ingredient" : "Add to pantry";

  const [showLibrary, setShowLibrary] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<{ id: number; name: string }[]>([]);

  async function openLibrary() {
    setShowLibrary(true);
    const res = await fetch("/api/ingredients-list");
    const data = await res.json();
    setOptions(data.ingredients ?? []);
  }

  function pickLibraryItem(ing: { id: number; name: string }) {
    appendPantryReviewLines([libraryItemToReviewLine({ ingredientId: ing.id, name: ing.name })]);
    window.location.href = "/shop/pantry/review";
  }

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-8">
      <header className="flex items-center gap-3">
        <Link
          href={backHref}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium">{title}</h1>
          <p className="text-sm text-[var(--muted)]">Pick the fastest way for what you&apos;ve got.</p>
        </div>
      </header>

      <div className="space-y-2.5">
        {METHODS.map((m) => {
          const Icon = m.icon;
          if (m.href === "#library") {
            return (
              <button
                key={m.title}
                type="button"
                onClick={() => void openLibrary()}
                className="flex w-full items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4 text-left"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${m.iconBg}`}>
                  <Icon className="h-6 w-6 text-[var(--primary)]" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.title}</p>
                  <p className="text-sm text-[var(--muted)]">{m.desc}</p>
                </div>
              </button>
            );
          }
          return (
            <Link
              key={m.href}
              href={m.href}
              className="flex items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${m.iconBg}`}>
                <Icon className="h-6 w-6 text-[var(--primary)]" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{m.title}</p>
                  {"badge" in m && m.badge && (
                    <span className="rounded-full bg-[var(--success)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      {m.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--muted)]">{m.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border border-[var(--ai)]/20 bg-[var(--ai-soft)] px-4 py-3 text-sm text-[var(--foreground)]">
        Whichever you pick, you&apos;ll confirm everything on one review screen before it&apos;s added.
      </div>

      <Link href="/shop/pantry/review">
        <Button variant="secondary" className="w-full">
          Review pending items
        </Button>
      </Link>

      {showLibrary && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-[430px] rounded-t-[var(--radius-lg)] bg-white p-5">
            <h3 className="mb-3 font-medium">Pick from library</h3>
            <Input
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mb-3"
              autoFocus
            />
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {filtered.slice(0, 40).map((ing) => (
                <button
                  key={ing.id}
                  type="button"
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[var(--beige)]"
                  onClick={() => pickLibraryItem(ing)}
                >
                  {ing.name}
                </button>
              ))}
            </div>
            <Button variant="secondary" className="mt-3 w-full" onClick={() => setShowLibrary(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

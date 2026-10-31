/*
 * Random subjunctive practice at /random-subjunctive, optionally filtered by tense.
 * Public metadata supplies candidate IDs; content-access.ts and useSubjunctiveTense
 * provide the allowed entries and permitted examples.
 * Full tense data stays in the server-only full-data modules, not this browser route.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useSubjunctiveTense } from "@/hooks/use-subjunctive";
import { isTense, TENSES, tenseLabel } from "@/data/subjunctive-tense";
import { cn } from "@/lib/utils";
import { randomSubjunctivePool } from "@/lib/content-access";
import { advance, shuffle } from "@/lib/random-sequence";
import { PageTransition } from "@/components/app/PageTransition";
import { SubjunctiveEntryView } from "@/components/app/SubjunctiveEntryView";

// createFileRoute connects this filename to its URL in the generated route tree.
export const Route = createFileRoute("/random-subjunctive")({
  // Query strings are untrusted input; keep only recognised values before the UI uses them.
  validateSearch: (s: Record<string, unknown>): { tense?: "present" | "imperfect" } =>
    isTense(s['tense']) ? { tense: s['tense'] } : {},
  component: RandomSubjunctive,
  // head supplies document titles and metadata, not visible page content.
  head: () => ({
    meta: [
      { title: "Random Subjunctive — Spanish subjunctive at random | Verb Wise" },
      {
        name: "description",
        content:
          "Practise the Spanish subjunctive one verb pair at a time, in random order, with triggers and graded examples.",
      },
      {
        property: "og:title",
        content: "Random Subjunctive — Spanish subjunctive at random | Verb Wise",
      },
      {
        property: "og:description",
        content:
          "Random subjunctive practice: three triggers per verb pair, shuffled once per session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function RandomSubjunctive() {
  const tense = Route.useSearch().tense ?? "present";
  // Only verified paid access expands this pool: a trial does not unlock study examples.
  const { entries, paid, status } = useSubjunctiveTense(tense);

  // Pool = only entries this browser may open. Unpaid: the 20 free entries.
  const pool = useMemo(() => {
    const ids = new Set(
      randomSubjunctivePool(
        entries.map((e) => e.id),
        paid,
      ),
    );
    return entries.filter((e) => ids.has(e.id) && e.triggers);
  }, [entries, paid]);

  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  // Shuffle once per session, and once more only if access changes (e.g. purchase confirmed).
  useEffect(() => {
    if (status === "checking") return;
    const key = `${tense}:${paid ? "paid" : "free"}`;
    if (seededFor === key || !pool.length) return;
    setSeededFor(key);
    setQueue(shuffle(pool.map((e) => e.id)));
    setIndex(0);
  }, [status, paid, pool, seededFor, tense]);

  const ids = useMemo(() => pool.map((e) => e.id), [pool]);
  const byId = useMemo(() => new Map(pool.map((e) => [e.id, e])), [pool]);
  const current = byId.get(queue[index] ?? "");
  const upcoming = byId.get(queue[index + 1] ?? "");
  const before = byId.get(queue[index - 1] ?? "");

  const next = useCallback(() => {
    setQueue((q) => advance(q, index, ids));
    setIndex((i) => i + 1);
  }, [ids, index]);
  const previous = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  return (
    <PageTransition>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          <Sparkles className="size-3.5" aria-hidden="true" /> Random subjunctive
        </span>
        <Link
          to="/subjunctive"
          className="min-h-11 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to subjunctive
        </Link>
      </div>

      <div role="radiogroup" aria-label="Subjunctive tense" className="mt-4 flex flex-wrap gap-2">
        {TENSES.map((t) => (
          <Link
            key={t}
            to="/random-subjunctive"
            search={{ tense: t }}
            role="radio"
            aria-checked={tense === t}
            className={cn(
              "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
              tense === t
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {tenseLabel[t]}
          </Link>
        ))}
      </div>

      {!current ? (
        <section className="surface-card mt-4 flex items-center justify-center gap-3 p-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Shuffling…
        </section>
      ) : (
        <SubjunctiveEntryView
          key={`${tense}-${index}-${current.id}`}
          entry={{ ...current, triggers: current.triggers! }}
          meta={`Entry ${(index % ids.length) + 1} of ${ids.length}${paid ? "" : " free"}`}
          tense={tense}
        />
      )}

      {!paid && status !== "checking" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Shuffling the 20 free entries.{" "}
          <Link to="/unlock" className="font-semibold text-primary hover:underline">
            Unlock all 100 with Medium and Hard examples
          </Link>
        </p>
      ) : null}

      <nav aria-label="Random subjunctive navigation" className="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={previous}
          disabled={index === 0}
          className="surface-card group flex min-h-16 items-center gap-3 p-4 text-left transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Previous
            </span>
            <span className="truncate font-display font-bold">
              {before?.title ?? "Start of session"}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!current}
          className="surface-card group flex min-h-16 items-center justify-end gap-3 p-4 text-right transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Next
            </span>
            <span className="truncate font-display font-bold">
              {upcoming?.title ?? "A fresh shuffle"}
            </span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-primary" aria-hidden="true" />
        </button>
      </nav>
    </PageTransition>
  );
}

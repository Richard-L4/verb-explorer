import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Shuffle } from "lucide-react";
import { cards, type VerbCard } from "@/data/cards";
import { useAccess } from "@/hooks/use-access";
import { useLearner } from "@/hooks/use-learner";
import { PageTransition } from "@/components/app/PageTransition";
import { VerbCardBody } from "@/components/app/VerbCardBody";
import { armPostStudyPanel, markRandomStudied } from "@/lib/random-session";

export const Route = createFileRoute("/random")({
  component: RandomCards,
  head: () => ({
    meta: [
      { title: "Random Cards — Spanish verbs at random | Verbs" },
      {
        name: "description",
        content:
          "Flick through Spanish verb cards at random. One card at a time, with the next verb always shown so you can decide before you move on.",
      },
      { property: "og:title", content: "Random Cards — Spanish verbs at random | Verbs" },
      {
        property: "og:description",
        content: "Flick through Spanish verb cards at random, one useful contrast at a time.",
      },
    ],
  }),
});

function shuffle(list: VerbCard[]): VerbCard[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = out[i]!;
    const b = out[j]!;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/** Cards shown per session once the trial has ended and nothing was purchased. */
const TASTER_LIMIT = 5;

function RandomCards() {
  const { isLocked, fullAccess } = useAccess();
  const { markViewed } = useLearner();

  // Expired, unpurchased visitors get a short taster drawn from the whole deck.
  const limited = !fullAccess;

  const available = useMemo(
    () => (limited ? cards : cards.filter((c) => !isLocked(c.id))),
    [isLocked, limited],
  );

  const [queue, setQueue] = useState<VerbCard[]>([]);
  const [index, setIndex] = useState(0);

  // First shuffled run, created after hydration so access state is known.
  // Nothing is persisted, so every fresh visit produces a different order.
  useEffect(() => {
    if (!available.length) return;
    setQueue((current) =>
      current.length ? current : shuffle(available).slice(0, limited ? TASTER_LIMIT : available.length),
    );
  }, [available, limited]);

  const current = queue[index];

  useEffect(() => {
    if (!current) return;
    markRandomStudied(current.id);
    armPostStudyPanel();
    markViewed(current.id);
  }, [current, markViewed]);

  const next = useCallback(() => {
    if (limited) {
      setIndex((i) => Math.min(i + 1, TASTER_LIMIT - 1));
      return;
    }
    setQueue((q) => {
      // At the end of a run, start a fresh shuffle after the ones already seen.
      if (index >= q.length - 1) return [...q, ...shuffle(available)];
      return q;
    });
    setIndex((i) => i + 1);
  }, [available, index, limited]);

  const previous = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  /** Taster only: throw the set away and draw five different cards. */
  const reshuffle = useCallback(() => {
    setQueue(shuffle(available).slice(0, TASTER_LIMIT));
    setIndex(0);
  }, [available]);

  const atTasterEnd = limited && index >= Math.min(TASTER_LIMIT, queue.length) - 1;
  const upcoming = queue[index + 1];
  const upcomingLabel = upcoming?.sides?.[0]?.word ?? upcoming?.title;

  if (!available.length) {
    return (
      <PageTransition>
        <section className="surface-card p-7 text-center sm:p-10">
          <h1 className="font-display text-2xl font-bold">Random Cards</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            There are no cards open to you just yet.
          </p>
          <Link
            to="/browse"
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            Browse the deck
          </Link>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          <Shuffle className="size-3.5" aria-hidden="true" /> Random cards
        </span>
        <Link
          to="/browse"
          className="min-h-11 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to browse
        </Link>
      </div>

      {current ? <VerbCardBody card={current} meta={`Card ${index + 1} this session`} /> : null}

      <nav aria-label="Random card navigation" className="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={previous}
          disabled={index === 0}
          className="surface-card group flex min-h-16 items-center gap-3 p-4 text-left transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft
            className="size-5 shrink-0 text-primary transition-transform duration-300 group-hover:-translate-x-1"
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Previous
            </span>
            <span className="truncate font-display font-bold">
              {index > 0 ? (queue[index - 1]?.sides?.[0]?.word ?? queue[index - 1]?.title) : "Start of session"}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={next}
          className="surface-card group flex min-h-16 items-center justify-end gap-3 p-4 text-right transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Next
            </span>
            <span className="truncate font-display font-bold">{upcomingLabel ?? "Another card"}</span>
          </span>
          <ArrowRight
            className="size-5 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </button>
      </nav>
    </PageTransition>
  );
}

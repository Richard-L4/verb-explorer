import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Shuffle, Timer, ListChecks } from "lucide-react";
import { cardCount } from "@/data/cards";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";

export const Route = createFileRoute("/quiz")({
  component: Quiz,
  head: () => ({
    meta: [
      { title: "Quiz mode (coming soon) | Verbs" },
      { name: "description", content: "Quiz mode for Spanish verb contrasts is on the way — test yourself on every card in the deck." },
      { property: "og:title", content: "Quiz mode (coming soon) | Verbs" },
      { property: "og:description", content: "Test yourself on Spanish verb contrasts — quiz mode is coming soon." },
    ],
  }),
});

const planned = [
  { icon: ListChecks, title: "Multiple choice", description: "Pick the right verb for a sentence drawn from the card examples." },
  { icon: Shuffle, title: "Shuffled decks", description: "Quiz the whole deck, only your favourites, or cards you haven't learned." },
  { icon: Timer, title: "Quick rounds", description: "Short timed rounds that fit into a coffee break." },
];

function Quiz() {
  return (
    <PageTransition>
      <PageHeader eyebrow="Quiz" title="Quiz mode is coming soon" description="Study the cards now — testing yourself lands in a future update." />

      <div className="surface-card gradient-soft hairline-top relative flex flex-col items-center gap-4 overflow-hidden p-10 text-center sm:p-14">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 size-72 rounded-full bg-primary/12 blur-3xl"
        />
        <span className="gradient-hero relative flex size-16 items-center justify-center rounded-2xl text-primary-foreground shadow-[var(--shadow-glow)]">
          <Brain className="size-7" aria-hidden="true" />
        </span>
        <h2 className="relative text-2xl font-bold sm:text-3xl">Not ready yet</h2>
        <p className="relative max-w-md text-sm leading-relaxed text-muted-foreground">
          Quizzes will be generated from the same {cardCount}-card dataset you're studying, so nothing extra to learn.
        </p>
        <Link
          to="/browse"
          className="relative inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:-translate-y-0.5"
        >
          Study the cards instead
        </Link>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {planned.map(({ icon: Icon, title, description }) => (
          <div key={title} className="surface-card p-5 transition-colors duration-300 hover:border-primary/30">
            <span className="grid size-10 place-items-center rounded-xl border border-border/70 bg-secondary/60 text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-display text-base font-bold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <span className="mt-4 inline-block rounded-full border border-border/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Planned
            </span>
          </div>
        ))}
      </div>
    </PageTransition>
  );
}

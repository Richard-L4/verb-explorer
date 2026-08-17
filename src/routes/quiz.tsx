import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Shuffle, Timer, ListChecks } from "lucide-react";
import { cardCount } from "@/data/cards";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";

export const Route = createFileRoute("/quiz")({
  component: Quiz,
  head: () => ({
    meta: [
      { title: "Quiz mode (coming soon) | Verbo" },
      { name: "description", content: "Quiz mode for Spanish verb contrasts is on the way — test yourself on every card in the deck." },
      { property: "og:title", content: "Quiz mode (coming soon) | Verbo" },
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

      <div className="surface-card gradient-soft flex flex-col items-center gap-4 p-10 text-center">
        <span className="gradient-hero flex size-16 items-center justify-center rounded-2xl text-primary-foreground">
          <Brain className="size-7" aria-hidden="true" />
        </span>
        <h2 className="text-2xl font-semibold">Not ready yet</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Quizzes will be generated from the same {cardCount}-card dataset you're studying, so nothing extra to learn.
        </p>
        <Link
          to="/browse"
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Study the cards instead
        </Link>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {planned.map(({ icon: Icon, title, description }) => (
          <div key={title} className="surface-card p-5 opacity-90">
            <Icon className="size-5 text-primary" aria-hidden="true" />
            <h3 className="mt-3 text-base font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <span className="mt-4 inline-block rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Planned
            </span>
          </div>
        ))}
      </div>
    </PageTransition>
  );
}

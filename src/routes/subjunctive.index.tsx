/*
 * Subjunctive hub at /subjunctive: index names the directory landing page.
 * Uses public totals and tense definitions to link to present/imperfect lists, quiz
 * and random practice; the shared detail components handle protected content.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Brain, Shuffle } from "lucide-react";
import { SUBJUNCTIVE_TOTAL } from "@/data/subjunctive-public";
import { TENSES, tenseLabel, type Tense } from "@/data/subjunctive-tense";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { SubjunctiveTenseLink } from "@/components/app/SubjunctiveEntryLink";

// createFileRoute connects this filename to its URL in the generated route tree.
export const Route = createFileRoute("/subjunctive/")({
  component: SubjunctiveHub,
  // head supplies document titles and metadata, not visible page content.
  head: () => ({
    meta: [
      { title: "Spanish subjunctive: present and imperfect | Verb Wise" },
      {
        name: "description",
        content:
          "Learn the Spanish present and imperfect subjunctive: triggers and graded Easy, Medium and Hard examples for every verb pair.",
      },
      { property: "og:title", content: "Spanish subjunctive: present and imperfect | Verb Wise" },
      {
        property: "og:description",
        content: "Choose a tense, then study wish, doubt, emotion and more with real examples.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const info: Record<Tense, { eyebrow: string; title: string; text: string; example: string; isNew?: boolean }> = {
  present: {
    eyebrow: "Present subjunctive",
    title: "Quiero que vengas",
    text: "Wishes, doubts and feelings about now and the future.",
    example: "quiero que · ojalá · es posible que",
  },
  imperfect: {
    eyebrow: "Imperfect subjunctive",
    title: "Quería que vinieras",
    text: "The same triggers in the past, plus 'si' clauses and 'como si'.",
    example: "quería que · si fuera · como si",
    isNew: true,
  },
};

const levels = [
  { id: "easy", label: "Easy", tone: "border-primary/30 bg-primary/10 text-primary" },
  { id: "medium", label: "Medium", tone: "border-accent/35 bg-accent/12 text-accent" },
  { id: "hard", label: "Hard", tone: "border-border bg-secondary text-foreground" },
];

function SubjunctiveHub() {
  return (
    <PageTransition>
      <PageHeader
        eyebrow="Subjunctive"
        title="Choose a tense"
        description={`Both tenses cover the same ${SUBJUNCTIVE_TOTAL} verb pairs, each with three triggers and Easy, Medium and Hard examples. The first 20 are free with Easy examples.`}
      />
      <div className="grid gap-5 md:grid-cols-2">
        {TENSES.map((t) => {
          const c = info[t];
          return (
            <section key={t} className="surface-card gradient-soft hairline-top flex min-w-0 flex-col p-6 sm:p-8">
              <p className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                {c.eyebrow}
                {c.isNew ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">New</span>
                ) : null}
              </p>
              <h2 lang="es" className="mt-3 font-display text-3xl font-bold leading-tight">
                {c.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
              <p lang="es" className="mt-2 text-sm font-semibold text-secondary-foreground">
                {c.example}
              </p>
              <div className="mt-4 flex flex-wrap gap-2" aria-label="Levels">
                {levels.map((l) => (
                  <span
                    key={l.id}
                    className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${l.tone}`}
                  >
                    {l.label}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3 pt-2 md:mt-auto">
                <SubjunctiveTenseLink
                  tense={t}
                  className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Study {tenseLabel[t].toLowerCase()}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </SubjunctiveTenseLink>
                <Link
                  to="/quiz"
                  search={{ tense: t }}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-secondary"
                >
                  <Brain className="size-4 text-primary" aria-hidden="true" /> Quiz
                </Link>
                <Link
                  to="/random-subjunctive"
                  search={{ tense: t }}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-secondary"
                >
                  <Shuffle className="size-4 text-primary" aria-hidden="true" /> Random
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </PageTransition>
  );
}

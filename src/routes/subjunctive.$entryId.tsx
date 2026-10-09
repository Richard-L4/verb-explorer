import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Clock, GitCompare, Quote } from "lucide-react";
import {
  getEntry,
  getEntryNeighbours,
  isEntryComplete,
  type SubjunctiveEntry,
} from "@/data/subjunctive";
import { getCard } from "@/data/cards";
import { useAccess } from "@/hooks/use-access";
import { Paywall } from "@/components/app/Paywall";
import { PageTransition } from "@/components/app/PageTransition";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subjunctive/$entryId")({
  loader: ({ params }) => {
    const entry = getEntry(params.entryId);
    const card = getCard(params.entryId);
    if (!entry && !card) throw notFound();
    // Only the id and title travel with the route; the learning content is read
    // in the component and only rendered once access is confirmed.
    return { id: params.entryId, title: entry?.title ?? card!.title };
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [{ title: "Entry not found | Verb Wise" }, { name: "robots", content: "noindex" }],
      };
    const t = `${loaderData.title} — subjunctive | Verb Wise`;
    const d = `When to use the subjunctive with ${loaderData.title}: three triggers and nine examples.`;
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: EntryDetail,
});

function EntryDetail() {
  const { id, title } = Route.useLoaderData();
  const { isLocked } = useAccess();
  const locked = isLocked(id);
  const entry = getEntry(id);
  const complete = isEntryComplete(id);

  return (
    <PageTransition>
      <Link
        to="/subjunctive"
        className="group inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft
          className="size-4 transition-transform duration-300 group-hover:-translate-x-1"
          aria-hidden="true"
        />{" "}
        Back to subjunctive
      </Link>

      {locked ? (
        <div className="mt-4">
          <Paywall title={title} />
        </div>
      ) : !entry || !complete ? (
        <section className="surface-card mt-4 p-10 text-center">
          <Clock className="mx-auto size-8 text-primary" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Coming soon — the subjunctive guide for this verb is on its way.
          </p>
        </section>
      ) : (
        <EntryBody entry={entry} />
      )}
    </PageTransition>
  );
}

const difficultyTone: Record<string, string> = {
  easy: "border-primary/30 bg-primary/10 text-primary",
  medium: "border-accent/35 bg-accent/12 text-accent",
  hard: "border-border bg-secondary text-foreground",
};

function EntryBody({ entry }: { entry: SubjunctiveEntry }) {
  const [active, setActive] = useState(0);
  const card = getCard(entry.id);
  const { prev, next, position, total } = getEntryNeighbours(entry.id);
  const trigger = entry.triggers[active]!;

  return (
    <>
      <header className="surface-card gradient-soft hairline-top relative mt-4 overflow-hidden p-6 sm:p-9">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/12 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="text-primary">Subjunctive</span>
          <span className="tabular-nums">
            Entry {position} of {total}
          </span>
        </div>
        <h1 className="relative mt-4 text-balance text-4xl font-bold leading-[1.02] sm:text-5xl">
          {entry.title}
        </h1>
        {card?.sides?.length ? (
          <dl className="relative mt-5 grid gap-3 sm:grid-cols-2">
            {card.sides.map((s) => (
              <div key={s.word} className="rounded-xl border border-border/70 bg-background/45 p-4">
                <dt lang="es" className="font-display text-lg font-bold text-primary">
                  {s.word}
                </dt>
                {s.core ? (
                  <dd className="mt-1 text-sm leading-relaxed text-foreground">{s.core}</dd>
                ) : null}
              </div>
            ))}
          </dl>
        ) : null}
        {card ? (
          <Link
            to="/card/$cardId"
            params={{ cardId: card.id }}
            className="relative mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Open the verb card <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </header>

      <div
        role="tablist"
        aria-label="Subjunctive triggers"
        className="mt-6 grid gap-2 sm:grid-cols-3"
      >
        {entry.triggers.map((t, i) => (
          <button
            key={t.trigger}
            type="button"
            role="tab"
            id={`trigger-tab-${i}`}
            aria-selected={active === i}
            aria-controls="trigger-panel"
            onClick={() => setActive(i)}
            className={cn(
              "min-h-14 rounded-2xl border px-4 py-2.5 text-left transition-all duration-200",
              active === i
                ? "border-primary/50 bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                : "border-border/70 bg-card/60 text-foreground hover:border-primary/30",
            )}
          >
            <span className="block text-[11px] font-bold uppercase tracking-[0.16em] opacity-75">
              Trigger {i + 1} · {t.category}
            </span>
            <span lang="es" className="block font-display text-lg font-bold">
              {t.trigger}
            </span>
          </button>
        ))}
      </div>

      <section
        id="trigger-panel"
        role="tabpanel"
        aria-labelledby={`trigger-tab-${active}`}
        className="surface-card hairline-top relative mt-4 overflow-hidden p-6 sm:p-7"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Why the subjunctive
        </p>
        <p className="mt-2 text-base leading-relaxed text-foreground">{trigger.explanation}</p>

        <ul className="mt-6 grid gap-4 lg:grid-cols-3">
          {trigger.examples.map((ex, j) => (
            <li
              key={`${active}-${j}`}
              className="flex flex-col rounded-xl border border-border/70 bg-background/45 p-4"
            >
              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em]",
                    difficultyTone[ex.difficulty],
                  )}
                >
                  {ex.difficulty}
                </span>
                <span className="rounded-full border border-border/80 px-2.5 py-0.5 text-[11px] font-bold tracking-[0.12em] text-muted-foreground">
                  {ex.level}
                </span>
              </div>
              <p className="mt-3 flex items-start gap-2 font-display text-lg font-bold leading-snug">
                <Quote className="mt-1.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
                <span lang="es">{ex.es}</span>
              </p>
              <p className="mt-1.5 pl-5 text-sm italic text-foreground/80">{ex.en}</p>
              <p className="mt-3 pl-5 text-sm">
                <span className="text-muted-foreground">Form: </span>
                <span lang="es" className="font-semibold text-primary">
                  {ex.form}
                </span>
              </p>
              <p className="mt-2 pl-5 text-sm leading-relaxed text-foreground">{ex.note}</p>
              {ex.contrast ? (
                <div className="mt-4 rounded-lg border border-accent/35 bg-accent/8 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                    <GitCompare className="size-3.5" aria-hidden="true" /> Compare
                  </p>
                  <p lang="es" className="mt-2 font-semibold leading-snug">
                    {ex.contrast.es}
                  </p>
                  <p className="mt-1 text-sm italic text-foreground/80">{ex.contrast.en}</p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">{ex.contrast.note}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {prev && next ? (
        <nav aria-label="Entry navigation" className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            to="/subjunctive/$entryId"
            params={{ entryId: prev.id }}
            className="surface-card group flex min-h-16 items-center gap-3 p-4 transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
          >
            <ArrowLeft className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Previous
              </span>
              <span className="block truncate font-display font-bold">{prev.title}</span>
            </span>
          </Link>
          <Link
            to="/subjunctive/$entryId"
            params={{ entryId: next.id }}
            className="surface-card group flex min-h-16 items-center justify-end gap-3 p-4 text-right transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Next
              </span>
              <span className="block truncate font-display font-bold">{next.title}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
          </Link>
        </nav>
      ) : null}
    </>
  );
}

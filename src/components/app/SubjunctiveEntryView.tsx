import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ArrowRight, GitCompare, Lock, Quote } from "lucide-react";
import { getCard } from "@/data/cards";
import type { PublicSubjunctiveEntry } from "@/lib/content-access";
import type { SubjunctiveExample } from "@/data/subjunctive";
import { useAccess } from "@/hooks/use-access";
import { cn } from "@/lib/utils";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

const difficultyTone: Record<string, string> = {
  easy: "border-primary/30 bg-primary/10 text-primary",
  medium: "border-accent/35 bg-accent/12 text-accent",
  hard: "border-border bg-secondary text-foreground",
};

/** Header, trigger tabs and examples. Locked difficulties show a placeholder only. */
export function SubjunctiveEntryView({
  entry,
  meta,
}: {
  entry: PublicSubjunctiveEntry & { triggers: NonNullable<PublicSubjunctiveEntry["triggers"]> };
  meta: ReactNode;
}) {
  const [active, setActive] = useState(0);
  const card = getCard(entry.id);
  const { price } = useAccess();
  const trigger = entry.triggers[Math.min(active, entry.triggers.length - 1)]!;

  return (
    <>
      <header className="surface-card gradient-soft hairline-top relative mt-4 overflow-hidden p-6 sm:p-9">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/12 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="text-primary">Subjunctive</span>
          <span className="tabular-nums">{meta}</span>
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

      <div role="tablist" aria-label="Subjunctive triggers" className="mt-6 grid gap-2 sm:grid-cols-3">
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
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Why the subjunctive</p>
        <p className="mt-2 text-base leading-relaxed text-foreground">{trigger.explanation}</p>

        <ul className="mt-6 grid gap-4 lg:grid-cols-3">
          {DIFFICULTIES.map((d) => {
            const ex = trigger.examples.find((x) => x.difficulty === d);
            return ex ? (
              <ExampleCard key={`${active}-${d}`} ex={ex} />
            ) : (
              <LockedExample key={`${active}-${d}`} difficulty={d} price={price} />
            );
          })}
        </ul>
      </section>
    </>
  );
}

function DifficultyBadge({ d }: { d: string }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em]",
        difficultyTone[d],
      )}
    >
      {d}
    </span>
  );
}

function ExampleCard({ ex }: { ex: SubjunctiveExample }) {
  return (
    <li className="flex flex-col rounded-xl border border-border/70 bg-background/45 p-4">
      <div className="flex flex-wrap gap-2">
        <DifficultyBadge d={ex.difficulty} />
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
  );
}

function LockedExample({ difficulty, price }: { difficulty: string; price: string }) {
  return (
    <li className="flex flex-col rounded-xl border border-dashed border-border/80 bg-background/30 p-4">
      <div className="flex flex-wrap gap-2">
        <DifficultyBadge d={difficulty} />
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Lock className="size-4 text-primary" aria-hidden="true" /> Included with full access
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Medium and Hard examples come with the one-off unlock.
      </p>
      <Link
        to="/unlock"
        className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-3 text-sm font-semibold text-primary hover:underline"
      >
        Unlock — {price} <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </li>
  );
}

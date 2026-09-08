import { motion } from "framer-motion";
import { AlertTriangle, Quote } from "lucide-react";
import type { VerbCard } from "@/data/cards";
import { useLearner } from "@/hooks/use-learner";
import { FavouriteButton } from "./FavouriteButton";
import { LearnedButton } from "./LearnedButton";

/**
 * The verb card itself — header, sides, examples, notes and the tricky bit.
 * Shared by the normal card page and Random Cards so both look identical.
 */
export function VerbCardBody({ card, meta }: { card: VerbCard; meta?: string }) {
  const { isFavourite, isLearned, toggleFavourite, toggleLearned } = useLearner();

  return (
    <>
      <header className="surface-card gradient-soft hairline-top relative mt-4 overflow-hidden p-6 sm:p-9">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/12 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {card.category ? <span className="text-primary">{card.category}</span> : null}
          {meta ? <span className="tabular-nums">{meta}</span> : null}
        </div>
        <h1 className="relative mt-4 text-balance text-4xl font-bold leading-[1.02] sm:text-5xl">{card.title}</h1>
        {card.tagline ? (
          <p className="relative mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {card.tagline}
          </p>
        ) : null}

        <div className="relative mt-7 flex flex-wrap gap-3">
          <FavouriteButton
            withText
            active={isFavourite(card.id)}
            label={card.title}
            onToggle={() => toggleFavourite(card.id)}
          />
          <LearnedButton active={isLearned(card.id)} label={card.title} onToggle={() => toggleLearned(card.id)} />
        </div>
      </header>

      {card.sides?.length ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {card.sides.map((side, i) => (
            <motion.section
              key={side.word}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              className="surface-card hairline-top relative overflow-hidden p-6 sm:p-7"
            >
              <h2 className="font-display text-2xl font-bold tracking-tight text-primary">{side.word}</h2>
              {side.core ? <p className="mt-3 text-sm leading-relaxed text-foreground">{side.core}</p> : null}

              {side.examples?.length ? (
                <ul className="mt-5 space-y-4">
                  {side.examples.map((ex, j) => (
                    <li
                      key={`${ex.es}-${j}`}
                      className="rounded-xl border border-border/70 bg-background/45 p-4 transition-colors duration-300 hover:border-primary/35"
                    >
                      <p className="flex items-start gap-2 font-display text-lg font-bold leading-snug">
                        <Quote className="mt-1.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
                        <span lang="es">{ex.es}</span>
                      </p>
                      {ex.en ? <p className="mt-1.5 pl-5 text-sm italic text-foreground/80">{ex.en}</p> : null}
                      {ex.note ? <p className="mt-2 pl-5 text-sm leading-relaxed text-foreground">{ex.note}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </motion.section>
          ))}
        </div>
      ) : null}

      {card.tricky ? (
        <section className="surface-card mt-6 border-accent/35 bg-accent/8 p-6 sm:p-7">
          <h2 className="flex items-center gap-2.5 text-lg font-bold">
            <span className="grid size-9 place-items-center rounded-xl border border-accent/35 bg-accent/12 text-accent">
              <AlertTriangle className="size-4.5" aria-hidden="true" />
            </span>
            Tricky bit
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/85">{card.tricky}</p>
        </section>
      ) : null}
    </>
  );
}

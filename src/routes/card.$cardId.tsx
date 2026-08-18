import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, AlertTriangle, Quote } from "lucide-react";
import { getCard, getNeighbours, getCardIndex, cardCount } from "@/data/cards";
import { useLearner } from "@/hooks/use-learner";
import { useAccess } from "@/hooks/use-access";
import { Paywall } from "@/components/app/Paywall";
import { PageTransition } from "@/components/app/PageTransition";
import { FavouriteButton } from "@/components/app/FavouriteButton";
import { LearnedButton } from "@/components/app/LearnedButton";

export const Route = createFileRoute("/card/$cardId")({
  loader: ({ params }) => {
    const card = getCard(params.cardId);
    if (!card) throw notFound();
    return { card };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Card not found | Verbs" }, { name: "robots", content: "noindex" }] };
    }
    const { card } = loaderData;
    const description = card.tagline ?? `Study the Spanish verb contrast ${card.title}.`;
    return {
      meta: [
        { title: `${card.title} — Spanish verb card | Verbs` },
        { name: "description", content: description.slice(0, 155) },
        { property: "og:title", content: `${card.title} — Spanish verb card | Verbs` },
        { property: "og:description", content: description.slice(0, 155) },
      ],
    };
  },
  component: CardDetail,
});

function CardDetail() {
  const { card } = Route.useLoaderData();
  const { isFavourite, isLearned, toggleFavourite, toggleLearned, markViewed } = useLearner();
  const { isLocked } = useAccess();
  const locked = isLocked(card.id);
  const { prev, next } = getNeighbours(card.id);
  const position = getCardIndex(card.id) + 1;

  useEffect(() => {
    if (locked) return;
    markViewed(card.id);
  }, [card.id, locked, markViewed]);

  return (
    <PageTransition>
      <Link
        to="/browse"
        className="group inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-1" aria-hidden="true" /> Back to browse
      </Link>

      {locked ? (
        <div className="mt-4">
          <Paywall title={card.title} />
        </div>
      ) : (
        <CardBody />
      )}
    </PageTransition>
  );

  function CardBody() {
    return (
      <>
      <header className="surface-card gradient-soft hairline-top relative mt-4 overflow-hidden p-6 sm:p-9">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/12 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {card.category ? <span className="text-primary">{card.category}</span> : null}
          <span className="tabular-nums">
            Card {position} of {cardCount}
          </span>
        </div>
        <h1 className="relative mt-4 text-balance text-4xl font-bold leading-[1.02] sm:text-5xl">{card.title}</h1>
        {card.tagline ? (
          <p className="relative mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">{card.tagline}</p>
        ) : null}

        <div className="relative mt-7 flex flex-wrap gap-3">
          <FavouriteButton withText active={isFavourite(card.id)} label={card.title} onToggle={() => toggleFavourite(card.id)} />
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

      <nav aria-label="Card navigation" className="mt-8 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            to="/card/$cardId"
            params={{ cardId: prev.id }}
            className="surface-card group flex min-h-16 items-center gap-3 p-4 transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
          >
            <ArrowLeft className="size-4 shrink-0 text-primary transition-transform duration-300 group-hover:-translate-x-1" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Previous</span>
              <span className="truncate font-display font-bold">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to="/card/$cardId"
            params={{ cardId: next.id }}
            className="surface-card group flex min-h-16 items-center justify-end gap-3 p-4 text-right transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Next</span>
              <span className="truncate font-display font-bold">{next.title}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        ) : null}
      </nav>
      </>
    );
  }
}

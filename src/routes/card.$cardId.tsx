import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, AlertTriangle, Quote } from "lucide-react";
import { getCard, getNeighbours, getCardIndex, cardCount } from "@/data/cards";
import { useLearner } from "@/hooks/use-learner";
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
      return { meta: [{ title: "Card not found | Verbo" }, { name: "robots", content: "noindex" }] };
    }
    const { card } = loaderData;
    const description = card.tagline ?? `Study the Spanish verb contrast ${card.title}.`;
    return {
      meta: [
        { title: `${card.title} — Spanish verb card | Verbo` },
        { name: "description", content: description.slice(0, 155) },
        { property: "og:title", content: `${card.title} — Spanish verb card | Verbo` },
        { property: "og:description", content: description.slice(0, 155) },
      ],
    };
  },
  component: CardDetail,
});

function CardDetail() {
  const { card } = Route.useLoaderData();
  const { isFavourite, isLearned, toggleFavourite, toggleLearned, markViewed } = useLearner();
  const { prev, next } = getNeighbours(card.id);
  const position = getCardIndex(card.id) + 1;

  useEffect(() => {
    markViewed(card.id);
  }, [card.id, markViewed]);

  return (
    <PageTransition>
      <Link to="/browse" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to browse
      </Link>

      <header className="surface-card gradient-soft mt-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {card.category ? <span className="text-primary">{card.category}</span> : null}
          <span>
            Card {position} of {cardCount}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{card.title}</h1>
        {card.tagline ? <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">{card.tagline}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
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
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="surface-card p-6"
            >
              <h2 className="font-display text-2xl font-semibold text-primary">{side.word}</h2>
              {side.core ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{side.core}</p> : null}

              {side.examples?.length ? (
                <ul className="mt-5 space-y-4">
                  {side.examples.map((ex, j) => (
                    <li key={`${ex.es}-${j}`} className="rounded-xl border border-border/80 bg-background/60 p-4">
                      <p className="flex items-start gap-2 font-display text-lg font-semibold">
                        <Quote className="mt-1.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
                        <span lang="es">{ex.es}</span>
                      </p>
                      {ex.en ? <p className="mt-1 pl-5 text-sm text-foreground/80">{ex.en}</p> : null}
                      {ex.note ? <p className="mt-2 pl-5 text-sm leading-relaxed text-muted-foreground">{ex.note}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </motion.section>
          ))}
        </div>
      ) : null}

      {card.tricky ? (
        <section className="surface-card mt-6 border-accent/40 bg-accent/10 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="size-5 text-primary" aria-hidden="true" /> Tricky bit
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/85">{card.tricky}</p>
        </section>
      ) : null}

      <nav aria-label="Card navigation" className="mt-8 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            to="/card/$cardId"
            params={{ cardId: prev.id }}
            className="surface-card flex min-h-16 items-center gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-lift)]"
          >
            <ArrowLeft className="size-4 text-primary" aria-hidden="true" />
            <span>
              <span className="block text-xs uppercase tracking-wide text-muted-foreground">Previous</span>
              <span className="font-medium">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to="/card/$cardId"
            params={{ cardId: next.id }}
            className="surface-card flex min-h-16 items-center justify-end gap-3 p-4 text-right transition-shadow hover:shadow-[var(--shadow-lift)]"
          >
            <span>
              <span className="block text-xs uppercase tracking-wide text-muted-foreground">Next</span>
              <span className="font-medium">{next.title}</span>
            </span>
            <ArrowRight className="size-4 text-primary" aria-hidden="true" />
          </Link>
        ) : null}
      </nav>
    </PageTransition>
  );
}

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
      <VerbCardBody card={card} meta={`Card ${position} of ${cardCount}`} />


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

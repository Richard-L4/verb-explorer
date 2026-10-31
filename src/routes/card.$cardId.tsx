/*
 * Detail page at /card/<cardId>: $cardId captures a changing URL segment.
 * The loader reads cards.ts; VerbCardBody renders it and useLearner records viewing.
 * Access comes from content-access.ts: standard verb cards are currently always free.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getCard, getNeighbours, getCardIndex, cardCount } from "@/data/cards";
import { useLearner } from "@/hooks/use-learner";
import { verbCardLocked } from "@/lib/content-access";
import { Paywall } from "@/components/app/Paywall";
import { PageTransition } from "@/components/app/PageTransition";
import { VerbCardBody } from "@/components/app/VerbCardBody";
import { SubjunctiveEntryLink } from "@/components/app/SubjunctiveEntryLink";

// createFileRoute connects this filename to its URL in the generated route tree.
export const Route = createFileRoute("/card/$cardId")({
  // A loader prepares route data before rendering; useLoaderData reads its result below.
  // Loaders can also run during browser navigation: they are not a server-only boundary.
  loader: ({ params }) => {
    const card = getCard(params.cardId);
    if (!card) throw notFound();
    return { card };
  },
  // head supplies document titles and metadata, not visible page content.
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
  // This custom hook (a reusable React function) subscribes to browser-saved learner
  // state, so progress changes update this page without a manual refresh.
  const { markViewed } = useLearner();
  const isLocked = verbCardLocked;
  const locked = isLocked(card.id);
  const { prev, next } = getNeighbours(card.id);
  const position = getCardIndex(card.id) + 1;

  // Effects run after rendering; do not count a paywall view as studying the content.
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
      <nav aria-label="Subjunctive for this verb" className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-muted-foreground">Subjunctive:</span>
        <SubjunctiveEntryLink
          tense="present"
          entryId={card.id}
          className="inline-flex min-h-11 items-center rounded-full border border-primary/40 bg-primary/10 px-4 font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          Present
        </SubjunctiveEntryLink>
        <SubjunctiveEntryLink
          tense="imperfect"
          entryId={card.id}
          className="inline-flex min-h-11 items-center rounded-full border border-primary/40 bg-primary/10 px-4 font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          Imperfect
        </SubjunctiveEntryLink>
      </nav>


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

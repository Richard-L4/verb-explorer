/*
 * Saved-card page at /favourites, using useLearner rather than a server loader.
 * The hook derives cards from browser-saved favourites; CardGrid renders them and
 * EmptyState links back to browse when there are none.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useLearner } from "@/hooks/use-learner";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { CardGrid } from "@/components/app/CardGrid";
import { EmptyState } from "@/components/app/EmptyState";

// createFileRoute connects this filename to its URL in the generated route tree.
export const Route = createFileRoute("/favourites")({
  component: Favourites,
  // head supplies document titles and metadata, not visible page content.
  head: () => ({
    meta: [
      { title: "Your favourite verb cards | Verbs" },
      { name: "description", content: "The Spanish verb cards you've saved, kept safe in your browser between visits." },
      { property: "og:title", content: "Your favourite verb cards | Verbs" },
      { property: "og:description", content: "Saved verb cards, stored locally and restored when you return." },
    ],
  }),
});

function Favourites() {
  // This custom hook (a reusable React function) subscribes to browser-saved learner
  // state, so progress changes update this page without a manual refresh.
  const { favouriteCards } = useLearner();

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Favourites"
        title="Saved cards"
        description="Cards you've starred. They stay here between visits."
      />
      {favouriteCards.length ? (
        <CardGrid cards={favouriteCards} />
      ) : (
        <EmptyState
          icon={Heart}
          title="No favourites yet"
          description="Tap the heart on any card to keep it here for quick revision."
          action={
            <Link
              to="/browse"
              className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              Browse cards
            </Link>
          }
        />
      )}
    </PageTransition>
  );
}

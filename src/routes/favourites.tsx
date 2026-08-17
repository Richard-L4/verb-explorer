import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useLearner } from "@/hooks/use-learner";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { CardGrid } from "@/components/app/CardGrid";
import { EmptyState } from "@/components/app/EmptyState";

export const Route = createFileRoute("/favourites")({
  component: Favourites,
  head: () => ({
    meta: [
      { title: "Your favourite verb cards | Verbo" },
      { name: "description", content: "The Spanish verb cards you've saved, kept safe in your browser between visits." },
      { property: "og:title", content: "Your favourite verb cards | Verbo" },
      { property: "og:description", content: "Saved verb cards, stored locally and restored when you return." },
    ],
  }),
});

function Favourites() {
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
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Browse cards
            </Link>
          }
        />
      )}
    </PageTransition>
  );
}

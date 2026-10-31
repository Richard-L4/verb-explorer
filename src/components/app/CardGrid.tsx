/** Displays verb tiles on collection pages. Props supply the cards; useLearner supplies progress and favourites, while the shared content-access policy supplies lock indicators. */
import type { VerbCard } from "@/data/cards";
import { VerbCardTile } from "./VerbCardTile";
import { useLearner } from "@/hooks/use-learner";
import { verbCardLocked } from "@/lib/content-access";

export function CardGrid({ cards }: { cards: VerbCard[] }) {
  const { isFavourite, isLearned, toggleFavourite, state } = useLearner();
  const isLocked = verbCardLocked;

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {/* Props pass data down; callbacks let each tile request a parent-managed favourite update. */}
      {cards.map((card, i) => (
        <VerbCardTile
          key={card.id}
          card={card}
          index={i}
          favourite={isFavourite(card.id)}
          learned={isLearned(card.id)}
          studied={Boolean(state.viewed[card.id])}
          locked={isLocked(card.id)}
          onToggleFavourite={toggleFavourite}
        />
      ))}
    </div>
  );
}

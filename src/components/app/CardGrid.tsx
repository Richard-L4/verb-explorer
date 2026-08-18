import type { VerbCard } from "@/data/cards";
import { VerbCardTile } from "./VerbCardTile";
import { useLearner } from "@/hooks/use-learner";
import { useAccess } from "@/hooks/use-access";

export function CardGrid({ cards }: { cards: VerbCard[] }) {
  const { isFavourite, isLearned, toggleFavourite, state } = useLearner();
  const { isLocked } = useAccess();

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

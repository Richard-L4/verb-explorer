import type { SayingCard } from "@/data/sayings";
import { SayingCardTile } from "./SayingCardTile";
import { useLearner } from "@/hooks/use-learner";
import { useAccess } from "@/hooks/use-access";

export function SayingGrid({ sayings }: { sayings: SayingCard[] }) {
  const { isFavourite, isLearned, toggleFavourite, state } = useLearner();
  const { isLocked } = useAccess();

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {sayings.map((saying, i) => (
        <SayingCardTile
          key={saying.id}
          saying={saying}
          index={i}
          favourite={isFavourite(saying.id)}
          learned={isLearned(saying.id)}
          studied={Boolean(state.viewed[saying.id])}
          locked={isLocked(saying.id)}
          onToggleFavourite={toggleFavourite}
        />
      ))}
    </div>
  );
}
import { useCallback, useEffect, useSyncExternalStore } from "react";
import * as store from "@/lib/progress";
import { cards, cardCount } from "@/data/cards";
import type { VerbCard } from "@/data/cards";

export function useLearner() {
  useEffect(() => {
    store.hydrate();
  }, []);

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  const isFavourite = useCallback((id: string) => state.favourites.includes(id), [state.favourites]);
  const isLearned = useCallback((id: string) => state.learned.includes(id), [state.learned]);

  const favouriteCards: VerbCard[] = cards.filter((c) => state.favourites.includes(c.id));
  const recentCards: VerbCard[] = state.recent
    .map((id) => cards.find((c) => c.id === id))
    .filter(Boolean) as VerbCard[];

  const studiedCount = Object.keys(state.viewed).length;
  const learnedCount = state.learned.length;

  return {
    state,
    isFavourite,
    isLearned,
    toggleFavourite: store.toggleFavourite,
    toggleLearned: store.toggleLearned,
    markViewed: store.markViewed,
    reset: store.resetAll,
    favouriteCards,
    recentCards,
    studiedCount,
    learnedCount,
    totalCards: cardCount,
    progressPercent: cardCount ? Math.round((learnedCount / cardCount) * 100) : 0,
    studiedPercent: cardCount ? Math.round((studiedCount / cardCount) * 100) : 0,
  };
}

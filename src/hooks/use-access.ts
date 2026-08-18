import { useCallback, useEffect, useSyncExternalStore } from "react";
import * as store from "@/lib/access";
import { cards } from "@/data/cards";

const freeCardIds = new Set(cards.slice(0, store.FREE_CARD_COUNT).map((c) => c.id));

export function useAccess() {
  useEffect(() => {
    store.hydrate();
  }, []);

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  const daysLeft = store.trialDaysLeft(state);
  const inTrial = !state.unlocked && daysLeft > 0;
  const fullAccess = state.unlocked || daysLeft > 0;

  /** True when this card id requires the unlock right now. */
  const isLocked = useCallback(
    (id: string) => {
      if (state.unlocked) return false;
      if (store.trialDaysLeft(state) > 0) return false;
      return !freeCardIds.has(id);
    },
    [state],
  );

  return {
    state,
    unlocked: state.unlocked,
    inTrial,
    fullAccess,
    trialDaysLeft: daysLeft,
    isLocked,
    unlock: store.unlock,
    resetAccess: store.resetAccess,
    endTrial: store.endTrial,
    freeCardCount: store.FREE_CARD_COUNT,
    price: store.UNLOCK_PRICE,
  };
}

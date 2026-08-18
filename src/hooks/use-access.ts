import { useCallback, useEffect, useSyncExternalStore } from "react";
import * as store from "@/lib/access";
import { cards } from "@/data/cards";

const freeCardIds = new Set(cards.slice(0, store.FREE_CARD_COUNT).map((c) => c.id));

export function useAccess() {
  useEffect(() => {
    store.hydrate();
  }, []);

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const rawPreview = useSyncExternalStore(
    store.subscribe,
    store.getBannerPreview,
    store.getBannerPreviewServer,
  );

  const daysLeft = store.trialDaysLeft(state);
  const creator = state.creator;
  const bannerPreview = creator ? rawPreview : null;
  /** Creator-only simulation: "expired" behaves exactly like a finished trial. */
  const simulatedExpiry = bannerPreview === "expired";
  const inTrial = simulatedExpiry ? false : !creator && !state.unlocked && daysLeft > 0;
  const fullAccess = simulatedExpiry ? false : creator || state.unlocked || daysLeft > 0;

  /** True when this card id requires the unlock right now. */
  const isLocked = useCallback(
    (id: string) => {
      if (simulatedExpiry) return !freeCardIds.has(id);
      if (state.creator) return false;
      if (state.unlocked) return false;
      if (store.trialDaysLeft(state) > 0) return false;
      return !freeCardIds.has(id);
    },
    [state, simulatedExpiry],
  );

  return {
    state,
    creator,
    bannerPreview,
    setBannerPreview: store.setBannerPreview,
    unlocked: simulatedExpiry ? false : state.unlocked,
    inTrial,
    fullAccess,
    trialDaysLeft: simulatedExpiry ? 0 : daysLeft,
    isLocked,
    unlock: store.unlock,
    resetAccess: store.resetAccess,
    endTrial: store.endTrial,
    freeCardCount: store.FREE_CARD_COUNT,
    price: store.UNLOCK_PRICE,
  };
}

/**
 * Custom hook (a reusable React state helper) for access-related UI.
 * Runs in the browser, with a safe server snapshot for initial rendering.
 * Depends on the access store and card IDs; local flags never authorise protected content.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";
import * as store from "@/lib/access";
import { sayingLocked } from "@/lib/content-access";
import { useSubjunctive } from "@/hooks/use-subjunctive";

export function useAccess() {
  useEffect(() => {
    store.hydrate();
  }, []);

  // useSyncExternalStore connects React to a store outside React; its server snapshot keeps initial rendering predictable.
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const rawPreview = useSyncExternalStore(
    store.subscribe,
    store.getBannerPreview,
    store.getBannerPreviewServer,
  );

  const daysLeft = store.trialDaysLeft(state);
  const creator = state.creator;
  const bannerPreview = creator ? rawPreview : null;
  /**
   * Creator-only simulation: "expired" behaves exactly like a finished trial.
   * It overrides the trial clock only — a real purchase always wins.
   */
  const simulatedExpiry = bannerPreview === "expired" && !state.unlocked;
  const inTrial = simulatedExpiry ? false : !creator && !state.unlocked && daysLeft > 0;
  const fullAccess = simulatedExpiry ? false : creator || state.unlocked || daysLeft > 0;

  // Full content is decided by the server (pass or trial record), never by local flags.
  const content = useSubjunctive();

  /** True when this saying requires the unlock right now. */
  const isLocked = useCallback(
    (id: string) => {
      if (simulatedExpiry) return true;
      return sayingLocked(id, content.paid);
    },
    [content.paid, simulatedExpiry],
  );

  return {
    state,
    creator,
    bannerPreview,
    setBannerPreview: store.setBannerPreview,
    unlocked: state.unlocked,
    inTrial,
    fullAccess,
    trialDaysLeft: simulatedExpiry ? 0 : daysLeft,
    isLocked,
    /** True while the server check is still running (avoid flashing a paywall). */
    checkingContent: content.status === "checking",
    unlock: store.unlock,
    resetAccess: store.resetAccess,
    endTrial: store.endTrial,
    freeCardCount: store.FREE_CARD_COUNT,
    price: store.UNLOCK_PRICE,
  };
}

/**
 * Custom hook (a reusable React state helper) for access-related UI.
 * Runs in the browser, with a safe server snapshot for initial rendering.
 * Depends on the access store and card IDs; local flags never authorise protected content.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";
import * as store from "@/lib/access";
import { sayingLocked } from "@/lib/content-access";
import { useSubjunctive } from "@/hooks/use-subjunctive";

export type ContentRole = "purchase" | "creator" | "preview" | "trial" | null;

/**
 * Pure access derivation. Creator status and trial status count only when the
 * server confirmed them: a local creator flag or a locally seeded trial clock
 * never establishes entitlement on its own.
 */
export function deriveAccess(input: {
  localUnlocked: boolean;
  daysLeft: number;
  trialCheck: store.TrialCheck;
  contentStatus: "checking" | "paid" | "unpaid";
  contentRole: ContentRole;
  rawPreview: number | "expired" | null;
}) {
  const { localUnlocked, daysLeft, trialCheck, contentStatus, contentRole, rawPreview } = input;
  const paid = contentStatus === "paid";
  const creator = paid && (contentRole === "creator" || contentRole === "preview");
  const verifiedPurchase = paid && contentRole === "purchase";
  const bannerPreview = creator ? rawPreview : null;
  const simulatedExpiry = bannerPreview === "expired" && !localUnlocked;
  const trialConfirmed = trialCheck === "verified";
  const inTrial = simulatedExpiry ? false : !creator && !localUnlocked && trialConfirmed && daysLeft > 0;
  const fullAccess = simulatedExpiry ? false : creator || localUnlocked || inTrial;
  const checkingContent = contentStatus === "checking";
  const checkingTrial = trialCheck === "checking";
  return {
    creator,
    verifiedPurchase,
    bannerPreview,
    simulatedExpiry,
    inTrial,
    fullAccess,
    checkingContent,
    checkingTrial,
    /** Both server checks finished; only then may trial-dependent UI decide. */
    accessSettled: !checkingContent && !checkingTrial,
    /** The server confirmed the trial clock and it has run out. */
    trialExpired: !simulatedExpiry && trialConfirmed && daysLeft <= 0,
  };
}

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

  const trialCheck = useSyncExternalStore(
    store.subscribe,
    store.getTrialCheck,
    store.getTrialCheckServer,
  );
  const daysLeft = store.trialDaysLeft(state);

  // Full content is decided by the server (pass or trial record), never by local flags.
  const content = useSubjunctive();
  const d = deriveAccess({
    localUnlocked: state.unlocked,
    daysLeft,
    trialCheck,
    contentStatus: content.status,
    contentRole: content.role,
    rawPreview,
  });
  const { creator, bannerPreview, simulatedExpiry, inTrial, fullAccess } = d;

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
    trialCheck,
    checkingTrial: d.checkingTrial,
    accessSettled: d.accessSettled,
    trialExpired: d.trialExpired,
    verifiedPurchase: d.verifiedPurchase,
    isLocked,
    /** True while the server check is still running (avoid flashing a paywall). */
    checkingContent: d.checkingContent,
    unlock: store.unlock,
    resetAccess: store.resetAccess,
    endTrial: store.endTrial,
    freeCardCount: store.FREE_CARD_COUNT,
    price: store.UNLOCK_PRICE,
  };
}

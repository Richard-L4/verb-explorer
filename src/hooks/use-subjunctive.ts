/**
 * Shares server-confirmed subjunctive content between browser components.
 * Depends on generated public data, the pass store and server calls.
 * A signed pass is a token the server checks; a local purchase flag is not proof.
 */
import { useEffect, useSyncExternalStore } from "react";
import { publicSubjunctive, publicImperfectSubjunctive } from "@/data/subjunctive-public";
import type { Tense } from "@/data/subjunctive-tense";
import type { PublicSubjunctiveEntry } from "@/lib/content-access";
import { getProtectedSubjunctive, requestAutomaticPass } from "@/lib/subjunctive-content.functions";
import { readContentPass, setPassSaver, writeContentPass } from "@/lib/content-pass-store";
import { isLovablePreviewHost } from "@/lib/preview";
import * as access from "@/lib/access";
import { setCardContent, type VerbCard } from "@/data/cards";
import { setSayingContent, type SayingCard } from "@/data/sayings";
import { whenServerSessionReady } from "@/lib/analytics";

/**
 * Content as this browser is entitled to see it. `paid` is true only after the
 * server confirmed a purchase/creator pass or an active trial and returned the
 * full content (verbs, both subjunctive tenses, sayings). Held in memory only —
 * never written to browser storage — and dropped when `accessUntil` passes.
 */
type Status = "checking" | "paid" | "unpaid";
interface Snapshot {
  status: Status;
  role: "purchase" | "creator" | "preview" | "trial" | null;
  /** When trial access ends (ISO); null for lifetime access. */
  accessUntil: string | null;
  entries: PublicSubjunctiveEntry[];
  /** Imperfect subjunctive, same access rules as `entries`. */
  imperfect: PublicSubjunctiveEntry[];
  /** Browser says it bought, but the server hasn't confirmed it yet. */
  needsConfirm: boolean;
}

const initial: Snapshot = { status: "checking", role: null, accessUntil: null, entries: publicSubjunctive, imperfect: publicImperfectSubjunctive, needsConfirm: false };
// Module-level state is shared by hook users, avoiding a separate content request for every component.
let snap: Snapshot = initial;
let started = false;
const listeners = new Set<() => void>();
const set = (next: Partial<Snapshot>) => {
  snap = { ...snap, ...next };
  listeners.forEach((l) => l());
};

let expiryTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleExpiry(until: string | null) {
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = null;
  if (!until) return;
  const ms = Date.parse(until) - Date.now();
  // setTimeout caps at ~24.8 days; trial windows are at most 7 days.
  expiryTimer = setTimeout(() => {
    settleUnpaid();
    void resolve();
  }, Math.max(0, Math.min(ms, 2_000_000_000)));
}

/** Asks the server for full content. `pass` may be null: the server then checks its own trial cookie. */
async function load(pass: string | null): Promise<boolean> {
  try {
    const res = await getProtectedSubjunctive({ data: { pass } });
    if (res.paid && res.entries && res.imperfect && res.verbs && res.sayings) {
      setCardContent(res.verbs as VerbCard[]);
      setSayingContent(res.sayings as SayingCard[]);
      set({ status: "paid", role: res.role, accessUntil: res.accessUntil, entries: res.entries, imperfect: res.imperfect, needsConfirm: false });
      scheduleExpiry(res.accessUntil);
      return true;
    }
  } catch {
    /* treat as unpaid */
  }
  return false;
}
const loadWithPass = (pass: string) => load(pass);

function settleUnpaid() {
  scheduleExpiry(null);
  setCardContent(null);
  setSayingContent(null);
  set({ status: "unpaid", role: null, accessUntil: null, entries: publicSubjunctive, imperfect: publicImperfectSubjunctive, needsConfirm: access.getSnapshot().unlocked });
}

async function resolve() {
  const pass = readContentPass();
  if (pass && (await loadWithPass(pass))) return;
  if (pass && readContentPass() === pass) writeContentPass(null);

  // Preview hosts only: the server verifies the host itself.
  if (isLovablePreviewHost()) {
    try {
      const res = await requestAutomaticPass();
      if (res.pass) {
        writeContentPass(res.pass);
        if (await loadWithPass(res.pass)) return;
      }
    } catch {
      /* fall through */
    }
  }
  // No valid pass: the server decides from its own trial record (cookie set by the trial check).
  await whenServerSessionReady();
  if (await load(null)) return;
  settleUnpaid();
}

/** Re-checks entitlement on return to the tab, so a revoked pass or ended trial drops content. */
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !started || snap.status !== "paid") return;
    if (snap.accessUntil && Date.parse(snap.accessUntil) <= Date.now()) {
      settleUnpaid();
      void resolve();
    }
  });
}

/** Called when checkout, restore or creator validation issues a new pass. */
setPassSaver(async (pass) => {
  set({ status: "checking" });
  if (!(await loadWithPass(pass))) settleUnpaid();
});

export { saveContentPass } from "@/lib/content-pass-store";

export function useSubjunctive() {
  useEffect(() => {
    access.hydrate();
    if (started) return;
    started = true;
    void resolve();
  }, []);
  const s = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snap,
    () => initial,
  );
  return { ...s, paid: s.status === "paid" };
}

/** Same as useSubjunctive, with `entries` set to the chosen tense. */
export function useSubjunctiveTense(tense: Tense) {
  const s = useSubjunctive();
  return { ...s, entries: tense === "imperfect" ? s.imperfect : s.entries };
}

import { useEffect, useSyncExternalStore } from "react";
import { publicSubjunctive } from "@/data/subjunctive-public";
import type { PublicSubjunctiveEntry } from "@/lib/content-access";
import { getProtectedSubjunctive, requestAutomaticPass } from "@/lib/subjunctive-content.functions";
import { readContentPass, setPassSaver, writeContentPass } from "@/lib/content-pass-store";
import { isLovablePreviewHost } from "@/lib/preview";
import * as access from "@/lib/access";

/**
 * Subjunctive content as this browser is entitled to see it. `paid` is true
 * only after the server accepted the signed pass and returned the content.
 */
type Status = "checking" | "paid" | "unpaid";
interface Snapshot {
  status: Status;
  role: "purchase" | "creator" | null;
  entries: PublicSubjunctiveEntry[];
  /** Browser says it bought, but the server hasn't confirmed it yet. */
  needsConfirm: boolean;
}

const initial: Snapshot = { status: "checking", role: null, entries: publicSubjunctive, needsConfirm: false };
let snap: Snapshot = initial;
let started = false;
const listeners = new Set<() => void>();
const set = (next: Partial<Snapshot>) => {
  snap = { ...snap, ...next };
  listeners.forEach((l) => l());
};

async function loadWithPass(pass: string): Promise<boolean> {
  try {
    const res = await getProtectedSubjunctive({ data: { pass } });
    if (res.paid && res.entries) {
      set({ status: "paid", role: res.role, entries: res.entries, needsConfirm: false });
      return true;
    }
  } catch {
    /* treat as unpaid */
  }
  return false;
}

function settleUnpaid() {
  set({ status: "unpaid", role: null, entries: publicSubjunctive, needsConfirm: access.getSnapshot().unlocked });
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
  if (snap.status !== "paid") settleUnpaid();
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

import { useEffect, useSyncExternalStore } from "react";
import { publicSubjunctive } from "@/data/subjunctive-public";
import type { PublicSubjunctiveEntry } from "@/lib/content-access";
import { getProtectedSubjunctive, requestAutomaticPass } from "@/lib/subjunctive-content.functions";
import * as access from "@/lib/access";

/**
 * Subjunctive content as this browser is entitled to see it. `paid` is true
 * only after the server accepted the signed pass and returned the content.
 */
export const CONTENT_PASS_KEY = "vw_content_pass_v1";
const AUTO_TRIED_KEY = "vw_content_pass_auto_v1";

type Status = "checking" | "paid" | "unpaid";
interface Snapshot {
  status: Status;
  entries: PublicSubjunctiveEntry[];
  /** Browser says it bought, but the server hasn't confirmed it yet. */
  needsConfirm: boolean;
}

const initial: Snapshot = { status: "checking", entries: publicSubjunctive, needsConfirm: false };
let snap: Snapshot = initial;
let started = false;
const listeners = new Set<() => void>();
const set = (next: Partial<Snapshot>) => {
  snap = { ...snap, ...next };
  listeners.forEach((l) => l());
};

function read(key: string, store: "local" | "session" = "local") {
  try {
    return (store === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null, store: "local" | "session" = "local") {
  try {
    const s = store === "local" ? localStorage : sessionStorage;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

async function loadWithPass(pass: string): Promise<boolean> {
  try {
    const res = await getProtectedSubjunctive({ data: { pass } });
    if (res.paid && res.entries) {
      set({ status: "paid", entries: res.entries, needsConfirm: false });
      return true;
    }
  } catch {
    /* treat as unpaid */
  }
  return false;
}

async function resolve() {
  const pass = read(CONTENT_PASS_KEY);
  if (pass && (await loadWithPass(pass))) return;
  if (pass) write(CONTENT_PASS_KEY, null);

  // The local creator flag only triggers a server check (preview hosts); it never unlocks.
  const state = access.getSnapshot();
  if (state.creator && read(AUTO_TRIED_KEY, "session") !== "1") {
    write(AUTO_TRIED_KEY, "1", "session");
    try {
      const res = await requestAutomaticPass();
      if (res.pass) {
        write(CONTENT_PASS_KEY, res.pass);
        if (await loadWithPass(res.pass)) return;
      }
    } catch {
      /* fall through */
    }
  }
  set({ status: "unpaid", entries: publicSubjunctive, needsConfirm: state.unlocked });
}

/** Saves a pass issued by checkout/restore and reloads the content. */
export async function saveContentPass(pass: string | null | undefined) {
  if (!pass) return;
  write(CONTENT_PASS_KEY, pass);
  set({ status: "checking" });
  if (!(await loadWithPass(pass))) set({ status: "unpaid" });
}

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

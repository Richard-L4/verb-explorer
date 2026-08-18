/**
 * Access / entitlement state (localStorage). No React or UI concerns here.
 *
 * Free tier: the first 10 verb cards are always available.
 * Trial: everything is open for 14 days from first visit.
 * Unlock: one-off £4.99 purchase gives permanent access in this browser.
 */
export interface AccessState {
  /** ISO date of the first visit — start of the 14-day trial. */
  trialStart: string | null;
  /** True once the one-off unlock has been purchased. */
  unlocked: boolean;
  /** Creator override — permanent full access, set via ?creator=<key>. */
  creator: boolean;
}

export const ACCESS_STORAGE_KEY = "verbo.access.v1";
export const CREATOR_STORAGE_KEY = "creator_access";
export const CREATOR_QUERY_KEY = "creator";
export const CREATOR_QUERY_VALUE = "hilary53";
export const TRIAL_DAYS = 14;
export const FREE_CARD_COUNT = 10;
export const UNLOCK_PRICE = "£4.99";

export const emptyAccess: AccessState = { trialStart: null, unlocked: false, creator: false };

const listeners = new Set<() => void>();
let cache: AccessState = emptyAccess;
let hydrated = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function read(): AccessState {
  if (!isBrowser()) return emptyAccess;
  let creatorFlag = false;
  try {
    creatorFlag = window.localStorage.getItem(CREATOR_STORAGE_KEY) === "true";
  } catch {
    creatorFlag = false;
  }
  try {
    const raw = window.localStorage.getItem(ACCESS_STORAGE_KEY);
    if (!raw) return { ...emptyAccess, creator: creatorFlag };
    const parsed = JSON.parse(raw) as Partial<AccessState>;
    return {
      trialStart: typeof parsed.trialStart === "string" ? parsed.trialStart : null,
      unlocked: parsed.unlocked === true,
      creator: creatorFlag || parsed.creator === true,
    };
  } catch {
    return { ...emptyAccess, creator: creatorFlag };
  }
}

function write(next: AccessState) {
  cache = next;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(next));
      if (next.creator) window.localStorage.setItem(CREATOR_STORAGE_KEY, "true");
    } catch {
      /* storage unavailable — keep in-memory state */
    }
  }
  listeners.forEach((l) => l());
}

/** Permanently marks this browser as the creator's. No-op if already set. */
export function enableCreatorAccess() {
  const current = read();
  if (current.creator) {
    cache = current;
    return;
  }
  write({ ...current, creator: true });
}

function creatorParamPresent() {
  if (!isBrowser()) return false;
  try {
    return new URLSearchParams(window.location.search).get(CREATOR_QUERY_KEY) === CREATOR_QUERY_VALUE;
  } catch {
    return false;
  }
}

export function hydrate() {
  if (hydrated || !isBrowser()) return;
  hydrated = true;
  if (creatorParamPresent()) enableCreatorAccess();
  const current = read();
  if (!current.trialStart) {
    write({ ...current, trialStart: new Date().toISOString() });
    return;
  }
  cache = current;
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  if (isBrowser()) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (isBrowser() && listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function onStorage(event: StorageEvent) {
  if (event.key && event.key !== ACCESS_STORAGE_KEY && event.key !== CREATOR_STORAGE_KEY) return;
  cache = read();
  listeners.forEach((l) => l());
}

export function getSnapshot(): AccessState {
  return cache;
}

export function getServerSnapshot(): AccessState {
  return emptyAccess;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days of trial left, clamped to 0..TRIAL_DAYS. */
export function trialDaysLeft(state: AccessState, now = Date.now()): number {
  if (!state.trialStart) return TRIAL_DAYS;
  const started = Date.parse(state.trialStart);
  if (Number.isNaN(started)) return TRIAL_DAYS;
  const left = Math.ceil((started + TRIAL_DAYS * DAY_MS - now) / DAY_MS);
  return Math.max(0, Math.min(TRIAL_DAYS, left));
}

export function trialActive(state: AccessState, now = Date.now()): boolean {
  return trialDaysLeft(state, now) > 0;
}

/**
 * Records the unlock. Payments are UI-only for now — when a real provider is
 * added, call it first and only run this after a confirmed successful payment.
 */
export function unlock() {
  write({ ...cache, unlocked: true });
}

/** Testing helper: clears the simulated purchase and restarts the trial clock. */
export function resetAccess() {
  write({ trialStart: new Date().toISOString(), unlocked: false, creator: cache.creator });
}

/** Testing helper: ends the trial immediately so the paywall can be seen. */
export function endTrial() {
  write({ ...cache, trialStart: new Date(Date.now() - (TRIAL_DAYS + 1) * DAY_MS).toISOString() });
}

/**
 * Learner state persistence (localStorage). Kept free of any React/UI concerns.
 */
export interface LearnerState {
  favourites: string[];
  learned: string[];
  /** cardId -> ISO timestamp of last view */
  viewed: Record<string, string>;
  /** most recently studied cardIds, newest first */
  recent: string[];
}

export const STORAGE_KEY = "verbo.learner-state.v1";

export const emptyState: LearnerState = { favourites: [], learned: [], viewed: {}, recent: [] };

const listeners = new Set<() => void>();
let cache: LearnerState = emptyState;
let hydrated = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function read(): LearnerState {
  if (!isBrowser()) return emptyState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<LearnerState>;
    return {
      favourites: Array.isArray(parsed.favourites) ? parsed.favourites : [],
      learned: Array.isArray(parsed.learned) ? parsed.learned : [],
      viewed: parsed.viewed && typeof parsed.viewed === "object" ? parsed.viewed : {},
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
    };
  } catch {
    return emptyState;
  }
}

function write(next: LearnerState) {
  cache = next;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — keep in-memory state */
    }
  }
  listeners.forEach((l) => l());
}

export function hydrate() {
  if (hydrated || !isBrowser()) return;
  hydrated = true;
  cache = read();
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
  if (event.key && event.key !== STORAGE_KEY) return;
  cache = read();
  listeners.forEach((l) => l());
}

export function getSnapshot(): LearnerState {
  return cache;
}

export function getServerSnapshot(): LearnerState {
  return emptyState;
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function toggleFavourite(id: string) {
  write({ ...cache, favourites: toggle(cache.favourites, id) });
}

export function toggleLearned(id: string) {
  write({ ...cache, learned: toggle(cache.learned, id) });
}

export function markViewed(id: string) {
  const recent = [id, ...cache.recent.filter((x) => x !== id)].slice(0, 12);
  write({ ...cache, viewed: { ...cache.viewed, [id]: new Date().toISOString() }, recent });
}

export function resetAll() {
  write({ ...emptyState, viewed: {} });
}

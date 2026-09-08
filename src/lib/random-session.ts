/**
 * Random Cards local state. Device-only: nothing here is ever sent to the
 * funnel analytics, the database or any third party.
 */

export const RANDOM_STUDIED_KEY = "vw_random_studied_v1";
/** Set while a Random Cards session is open, so leaving can show the panel. */
export const RANDOM_PENDING_KEY = "vw_random_pending_v1";
/** Post-study panel dismissal (separate from the existing InstallBanner key). */
export const POST_STUDY_DISMISSED_KEY = "vw_post_study_dismissed_v1";
/** "prompted" once the install step has been completed or acted on. */
export const INSTALL_STEP_KEY = "vw_install_step_v1";
/** "declined" | "granted" | "denied" — controls the reminder invitation. */
export const REMINDER_INVITE_KEY = "vw_reminder_invite_v1";

interface StudiedRecord {
  ids: string[];
}

const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeRandom(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function readIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(RANDOM_STUDIED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<StudiedRecord>;
    return Array.isArray(parsed.ids) ? parsed.ids.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Distinct Random Cards studied on this device, all-time. */
export function studiedCount(): number {
  return readIds().length;
}

/** Records one card as studied in Random Cards. Counted once per card. */
export function markRandomStudied(cardId: string) {
  if (!isBrowser()) return;
  const ids = readIds();
  if (ids.includes(cardId)) return;
  ids.push(cardId);
  try {
    window.localStorage.setItem(RANDOM_STUDIED_KEY, JSON.stringify({ ids } satisfies StudiedRecord));
  } catch {
    /* storage unavailable */
  }
  emit();
}

export function readFlag(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeFlag(key: string, value: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
  emit();
}

export function clearFlag(key: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
  emit();
}

/** Called while the user is on /random with at least one card studied. */
export function armPostStudyPanel() {
  writeFlag(RANDOM_PENDING_KEY, "1");
  clearFlag(POST_STUDY_DISMISSED_KEY);
}

export function postStudyPending(): boolean {
  return readFlag(RANDOM_PENDING_KEY) === "1" && readFlag(POST_STUDY_DISMISSED_KEY) !== "1";
}

export function dismissPostStudyPanel() {
  writeFlag(POST_STUDY_DISMISSED_KEY, "1");
  clearFlag(RANDOM_PENDING_KEY);
}

/** Session-scoped marker: the user has moved off the Home page this visit. */
const MOVED_AWAY_KEY = "vw_moved_away_v1";

export function markMovedAwayFromHome() {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(MOVED_AWAY_KEY, "1");
  } catch {
    /* storage unavailable */
  }
}

export function movedAwayFromHome(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.sessionStorage.getItem(MOVED_AWAY_KEY) === "1";
  } catch {
    return false;
  }
}

/** The install CTA has not yet been completed, acted on or dismissed. */
export function installCtaPending(): boolean {
  return readFlag(INSTALL_STEP_KEY) === null && readFlag(POST_STUDY_DISMISSED_KEY) !== "1";
}

/** The daily-reminder invitation has never been answered on this device. */
export function reminderInvitePending(): boolean {
  return readFlag(REMINDER_INVITE_KEY) === null;
}

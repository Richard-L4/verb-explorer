/**
 * Anonymous funnel analytics (browser side).
 *
 * - The only identifier is a random UUID stored in this browser. It is never
 *   linked to a name, email address, IP address or advertising identifier.
 * - Creator-mode browsers (including banner preview/testing) send nothing.
 * - Every event is de-duplicated locally so repeat page loads cannot inflate
 *   the funnel, and the server de-duplicates again as a backstop.
 * - All failures are swallowed: analytics must never affect the app.
 */

export const ANALYTICS_EVENTS = [
  "app_visit",
  "trial_started",
  "reminder_7",
  "reminder_3",
  "reminder_2",
  "reminder_1",
  "trial_expired",
  "checkout_started",
  "purchase_completed",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export const DEVICE_ID_KEY = "verbo.device.v1";
export const TEST_DEVICE_ID_KEY = "verbo.device.test.v1";
export const EVENT_LOG_KEY = "verbo.events.v1";

/**
 * Sticky "this browser is used for testing" marker. Once latched it is never
 * removed by any in-app control — not "Reset test state", not "Reset all
 * progress". It is mirrored into a long-lived first-party cookie so it also
 * survives a localStorage-only clear.
 */
export const TEST_DEVICE_KEY = "verbo.test-device.v1";
export const TEST_DEVICE_COOKIE = "vw_test";
const TEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 3650; // ~10 years

// Duplicated deliberately: importing src/lib/access.ts here would create an
// import cycle (access.ts logs events through this module).
const CREATOR_FLAG_KEY = "creator_access";
const ACCESS_KEY = "verbo.access.v1";
const BANNER_PREVIEW_KEY = "verbo.banner-preview.v1";


function isBrowser() {
  return typeof window !== "undefined";
}

function readLocal(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — analytics simply degrades */
  }
}

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function readTestCookie(): boolean {
  if (!isBrowser() || typeof document === "undefined") return false;
  try {
    return document.cookie
      .split(";")
      .some((part) => part.trim() === `${TEST_DEVICE_COOKIE}=1`);
  } catch {
    return false;
  }
}

function writeTestCookie() {
  if (!isBrowser() || typeof document === "undefined") return;
  try {
    document.cookie = `${TEST_DEVICE_COOKIE}=1; path=/; max-age=${TEST_COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch {
    /* cookies unavailable — the localStorage marker still applies */
  }
}

/**
 * Latches this browser as a test device. Idempotent, and deliberately one-way:
 * nothing in the app ever clears it.
 */
export function markTestDevice() {
  if (!isBrowser()) return;
  writeLocal(TEST_DEVICE_KEY, "true");
  writeTestCookie();
}

/**
 * True when this browser must never produce production analytics: creator
 * mode, banner preview, or the sticky test marker (localStorage or cookie).
 */
export function isTestDevice(): boolean {
  if (!isBrowser()) return false;
  if (readLocal(TEST_DEVICE_KEY) === "true") return true;
  if (readTestCookie()) return true;
  if (readLocal(CREATOR_FLAG_KEY) === "true") return true;
  if (readLocal(BANNER_PREVIEW_KEY) !== null) return true;
  try {
    const raw = readLocal(ACCESS_KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as { creator?: boolean }).creator === true;
  } catch {
    return false;
  }
}

/** Back-compat alias for existing call sites. */
export const isCreatorDevice = isTestDevice;

/**
 * The anonymous device id for this browser, created on first use.
 * Clearing browser storage produces a new id — documented in the Privacy Policy.
 *
 * Test devices get a separate, `test-` prefixed id so the server can reject
 * them on the identifier alone.
 */
export function getDeviceId(): string | null {
  if (!isBrowser()) return null;
  if (isTestDevice()) {
    const existingTest = readLocal(TEST_DEVICE_ID_KEY);
    if (existingTest && existingTest.length > 0) return existingTest;
    const createdTest = `test-${randomId()}`;
    writeLocal(TEST_DEVICE_ID_KEY, createdTest);
    return createdTest;
  }
  const existing = readLocal(DEVICE_ID_KEY);
  if (existing && existing.length > 0) return existing;
  const created = randomId();
  writeLocal(DEVICE_ID_KEY, created);
  return created;
}


function sentKeys(): Record<string, true> {
  try {
    const raw = readLocal(EVENT_LOG_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, true>) : {};
  } catch {
    return {};
  }
}

export function hasSent(key: string): boolean {
  return sentKeys()[key] === true;
}

function markSent(key: string) {
  const next = { ...sentKeys(), [key]: true as const };
  writeLocal(EVENT_LOG_KEY, JSON.stringify(next));
}

/** UTC calendar day, used for the once-per-day app_visit event. */
export function todayStamp(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export interface EventPayload {
  deviceId: string;
  event: AnalyticsEvent;
  trialDay: number | null;
  occurredOn: string;
  /** Belt and braces: set when this browser is a latched test device. */
  testDevice?: boolean;
}


type Transport = (payload: EventPayload) => Promise<unknown>;

let transport: Transport | null = null;

/** Test seam: replace the network transport. */
export function setAnalyticsTransport(next: Transport | null) {
  transport = next;
}

async function send(payload: EventPayload) {
  if (transport) {
    await transport(payload);
    return;
  }
  const { logTrialEvent } = await import("./analytics.functions");
  await logTrialEvent({ data: payload });
}

/**
 * Records one funnel event. Resolves to true when the event was sent for the
 * first time, false when suppressed (creator, server-side, already sent) or
 * when the write failed.
 */
export async function logEvent(
  event: AnalyticsEvent,
  options: { trialDay?: number | null; dedupeKey?: string } = {},
): Promise<boolean> {
  if (!isBrowser()) return false;
  if (isCreatorDevice()) return false;

  const occurredOn = todayStamp();
  const dedupeKey = options.dedupeKey ?? event;
  if (hasSent(dedupeKey)) return false;

  const deviceId = getDeviceId();
  if (!deviceId) return false;

  // Mark before sending so a slow/failed request cannot cause a duplicate on
  // the next render; funnel counts favour under- over over-counting.
  markSent(dedupeKey);

  try {
    await send({
      deviceId,
      event,
      trialDay: options.trialDay ?? null,
      occurredOn,
    });
    return true;
  } catch {
    return false;
  }
}

/** app_visit — first page load of the (UTC) day for this browser. */
export function logAppVisit(): Promise<boolean> {
  return logEvent("app_visit", { dedupeKey: `app_visit:${todayStamp()}` });
}

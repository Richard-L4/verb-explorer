/**
 * Server-only funnel analytics writer/reader.
 *
 * Uses the existing Supabase service-role admin client. The `trial_events`
 * table is never exposed to the browser: RLS is on with no anon access and
 * every write goes through here.
 */

import { getSupabaseAdmin } from "./payments.server";
import { ANALYTICS_EVENTS, type AnalyticsEvent } from "./analytics";

export interface TrialEventInput {
  deviceId: string;
  event: AnalyticsEvent;
  trialDay?: number | null;
  occurredOn?: string | null;
  /** Creator/developer test traffic — never written. */
  testDevice?: boolean;
}

/** Authoritative test-traffic guard. Every write path funnels through here. */
export function isTestEvent(input: Pick<TrialEventInput, "deviceId" | "testDevice">): boolean {
  return input.testDevice === true || input.deviceId.startsWith("test-");
}

/**
 * Inserts one event, ignoring duplicates on (device_id, event, occurred_on).
 * Never throws: if Supabase is unavailable or the migration has not been run
 * yet, the app must carry on as normal.
 */
export async function recordTrialEvent(input: TrialEventInput): Promise<boolean> {
  // Server-side guard: creator/developer/testing traffic is dropped before
  // it can reach production analytics. Existing rows are never touched.
  if (isTestEvent(input)) return false;

  try {
    const db = getSupabaseAdmin();
    const occurredOn = input.occurredOn ?? new Date().toISOString().slice(0, 10);


    const { error } = await db
      .from("trial_events")
      .upsert(
        {
          device_id: input.deviceId,
          event: input.event,
          trial_day: input.trialDay ?? null,
          occurred_on: occurredOn,
        },
        { onConflict: "device_id,event,occurred_on", ignoreDuplicates: true },
      );

    if (error) {
      console.warn("[analytics] event not recorded:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.warn(
      "[analytics] event not recorded:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

export type FunnelCounts = Record<AnalyticsEvent, number>;

/**
 * One-time display baseline (7 Sep 2026): subtracts the ~10 known
 * creator/test devices from the Creator Funnel display only. The database
 * keeps the complete raw record; new genuine events raise the displayed
 * count one-for-one.
 */
const BASELINE_ADJUSTMENT: Partial<Record<AnalyticsEvent, number>> = {
  app_visit: 10,
  trial_started: 10,
};

function emptyCounts(): FunnelCounts {
  return Object.fromEntries(ANALYTICS_EVENTS.map((e) => [e, 0])) as FunnelCounts;
}

/**
 * Distinct-device counts per event. Device ids are aggregated away here and
 * never leave the server.
 */
export async function getFunnelCountsFromDb(): Promise<{
  counts: FunnelCounts;
  available: boolean;
}> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("trial_events").select("device_id, event");

    if (error) {
      console.warn("[analytics] funnel read failed:", error.message);
      return { counts: emptyCounts(), available: false };
    }

    const seen = new Map<string, Set<string>>();
    for (const row of (data ?? []) as { device_id: string; event: string }[]) {
      if (!seen.has(row.event)) seen.set(row.event, new Set());
      seen.get(row.event)!.add(row.device_id);
    }

    const counts = emptyCounts();
    for (const event of ANALYTICS_EVENTS) {
      const raw = seen.get(event)?.size ?? 0;
      counts[event] = Math.max(0, raw - (BASELINE_ADJUSTMENT[event] ?? 0));
    }
    return { counts, available: true };
  } catch (error) {
    console.warn(
      "[analytics] funnel read failed:",
      error instanceof Error ? error.message : String(error),
    );
    return { counts: emptyCounts(), available: false };
  }
}

/**
 * Repeat-visitor summary (creator-only, read-only).
 *
 * A repeat visitor is an anonymous device with more than one `app_visit` row.
 * Device ids never leave the server: each device is given a deterministic
 * anonymous label ("Visitor A", "Visitor B", …) derived from its rank in a
 * stable ordering.
 *
 * Country: `trial_events` stores no location data and no IP address, and the
 * edge country header only describes the *current* request (the creator's own
 * browser), not the historical visitor. There is therefore no reliable country
 * for a past visit, so `country` is null and the UI shows "—".
 */
export interface RepeatVisitor {
  label: string;
  visits: number;
  country: string | null;
  firstVisit: string;
  lastVisit: string;
  trialStart: string | null;
}

export interface RepeatVisitorSummary {
  available: boolean;
  total: number;
  totalVisits: number;
  heavy: number;
  light: number;
  visitors: RepeatVisitor[];
  countries: { country: string; count: number }[];
}

function emptyRepeat(available: boolean): RepeatVisitorSummary {
  return {
    available,
    total: 0,
    totalVisits: 0,
    heavy: 0,
    light: 0,
    visitors: [],
    countries: [],
  };
}

function visitorLabel(index: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let n = index;
  let out = "";
  do {
    out = letters[n % 26] + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Visitor ${out}`;
}

export async function getRepeatVisitorsFromDb(): Promise<RepeatVisitorSummary> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("trial_events")
      .select("device_id, event, occurred_at")
      .in("event", ["app_visit", "trial_started"]);

    if (error) {
      console.warn("[analytics] repeat visitors read failed:", error.message);
      return emptyRepeat(false);
    }

    type Row = { device_id: string; event: string; occurred_at: string };
    const byDevice = new Map<
      string,
      { visits: number; first: string; last: string; trialStart: string | null }
    >();

    for (const row of (data ?? []) as Row[]) {
      const at = row.occurred_at;
      const entry =
        byDevice.get(row.device_id) ??
        { visits: 0, first: at, last: at, trialStart: null };
      if (row.event === "app_visit") {
        entry.visits += 1;
        if (at < entry.first) entry.first = at;
        if (at > entry.last) entry.last = at;
      } else if (row.event === "trial_started") {
        if (!entry.trialStart || at < entry.trialStart) entry.trialStart = at;
      }
      byDevice.set(row.device_id, entry);
    }

    const repeats = [...byDevice.entries()]
      .filter(([, v]) => v.visits > 1)
      .sort((a, b) => {
        if (b[1].visits !== a[1].visits) return b[1].visits - a[1].visits;
        if (b[1].last !== a[1].last) return b[1].last < a[1].last ? -1 : 1;
        return a[0] < b[0] ? -1 : 1;
      });

    const visitors: RepeatVisitor[] = repeats.map(([, v], i) => ({
      label: visitorLabel(i),
      visits: v.visits,
      country: null,
      firstVisit: v.first,
      lastVisit: v.last,
      trialStart: v.trialStart,
    }));

    return {
      available: true,
      total: visitors.length,
      totalVisits: visitors.reduce((sum, v) => sum + v.visits, 0),
      heavy: visitors.filter((v) => v.visits >= 5).length,
      light: visitors.filter((v) => v.visits >= 2 && v.visits <= 4).length,
      visitors,
      countries: [],
    };
  } catch (error) {
    console.warn(
      "[analytics] repeat visitors read failed:",
      error instanceof Error ? error.message : String(error),
    );
    return emptyRepeat(false);
  }
}

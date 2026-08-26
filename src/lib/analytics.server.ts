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
}

/**
 * Inserts one event, ignoring duplicates on (device_id, event, occurred_on).
 * Never throws: if Supabase is unavailable or the migration has not been run
 * yet, the app must carry on as normal.
 */
export async function recordTrialEvent(input: TrialEventInput): Promise<boolean> {
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
      counts[event] = seen.get(event)?.size ?? 0;
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

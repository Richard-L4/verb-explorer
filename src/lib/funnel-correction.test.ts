import { describe, expect, it, vi } from "vitest";
import {
  computeFunnelCounts,
  isProductionAnalyticsHost,
  recordTrialEvent,
} from "./analytics.server";
import { EXCLUDED_DEVICE_IDS_2026_10_09 } from "./funnel-exclusions.server";
import * as payments from "./payments.server";

const excluded = [...EXCLUDED_DEVICE_IDS_2026_10_09];

describe("only the live site records Funnel events", () => {
  it.each(["localhost", "id-preview--6380e654.lovable.app", "preview--verb-wise-flashcards.lovable.app", "abc.lovableproject.com", null])(
    "never writes from %s",
    async (host) => {
      const upsert = vi.fn(async () => ({ error: null }));
      vi.spyOn(payments, "getSupabaseAdmin").mockReturnValue({ from: () => ({ upsert }) } as never);
      for (const event of ["app_visit", "trial_started"] as const) {
        expect(await recordTrialEvent({ host, deviceId: "device-1234567", event })).toBe(false);
      }
      expect(upsert).not.toHaveBeenCalled();
    },
  );
  it("records from the production domains", () => {
    expect(isProductionAnalyticsHost("verb-wise.richard-wells.com")).toBe(true);
    expect(isProductionAnalyticsHost("verb-wise-flashcards.lovable.app")).toBe(true);
  });
});

describe("Funnel correction", () => {
  it("excludes exactly the 117 fixed 9 Oct devices", () => {
    expect(EXCLUDED_DEVICE_IDS_2026_10_09.size).toBe(117);
  });

  it("applies exclusion, 7 Sep baseline (-10) and +3 estimated visits once", () => {
    const rows: { device_id: string; event: string }[] = [];
    // 230 kept visit devices, 175 of which started a trial.
    for (let i = 0; i < 230; i++) {
      rows.push({ device_id: `real-${i}`, event: "app_visit" });
      if (i < 175) rows.push({ device_id: `real-${i}`, event: "trial_started" });
    }
    // 117 excluded devices, 31 with trials, with repeated rows.
    excluded.forEach((id, i) => {
      rows.push({ device_id: id, event: "app_visit" }, { device_id: id, event: "app_visit" });
      if (i < 31) rows.push({ device_id: id, event: "trial_started" });
    });
    const c = computeFunnelCounts(rows);
    expect(c.app_visit).toBe(223);
    expect(c.trial_started).toBe(165);
  });

  it("leaves earlier figures unchanged when no excluded device is present", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ device_id: `old-${i}`, event: "trial_started" }));
    expect(computeFunnelCounts(rows).trial_started).toBe(40);
  });
});

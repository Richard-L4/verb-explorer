import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEVICE_ID_KEY,
  EVENT_LOG_KEY,
  getDeviceId,
  isCreatorDevice,
  logAppVisit,
  logEvent,
  setAnalyticsTransport,
  todayStamp,
  type EventPayload,
} from "./analytics";
import { getFunnelCountsFromDb, recordTrialEvent } from "./analytics.server";

function useTransport() {
  const sent: EventPayload[] = [];
  setAnalyticsTransport(async (payload) => {
    sent.push(payload);
  });
  return sent;
}

beforeEach(() => {
  window.localStorage.clear();
  setAnalyticsTransport(null);
  vi.restoreAllMocks();
});

describe("anonymous device id", () => {
  it("creates an id on first visit and reuses it afterwards", () => {
    expect(window.localStorage.getItem(DEVICE_ID_KEY)).toBeNull();
    const first = getDeviceId();
    expect(first).toBeTruthy();
    expect(getDeviceId()).toBe(first);
    expect(window.localStorage.getItem(DEVICE_ID_KEY)).toBe(first);
  });

  it("never stores names or emails alongside the id", () => {
    const id = getDeviceId()!;
    expect(id).not.toMatch(/@/);
  });
});

describe("app_visit", () => {
  it("is recorded once per day and again on a new day", async () => {
    const sent = useTransport();

    expect(await logAppVisit()).toBe(true);
    expect(await logAppVisit()).toBe(false);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.event).toBe("app_visit");

    // Simulate the next day by clearing only that day's dedupe key.
    const log = JSON.parse(window.localStorage.getItem(EVENT_LOG_KEY)!) as Record<string, true>;
    delete log[`app_visit:${todayStamp()}`];
    window.localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(log));

    expect(await logAppVisit()).toBe(true);
    expect(sent).toHaveLength(2);
  });
});

describe("event de-duplication", () => {
  it("records each funnel event once per device", async () => {
    const sent = useTransport();
    for (const event of ["trial_started", "reminder_7", "reminder_3", "reminder_2", "reminder_1", "trial_expired"] as const) {
      expect(await logEvent(event)).toBe(true);
      expect(await logEvent(event)).toBe(false);
    }
    expect(sent.map((s) => s.event)).toEqual([
      "trial_started",
      "reminder_7",
      "reminder_3",
      "reminder_2",
      "reminder_1",
      "trial_expired",
    ]);
  });
});

describe("creator mode", () => {
  it("produces no events when the creator flag is set", async () => {
    window.localStorage.setItem("creator_access", "true");
    const sent = useTransport();
    expect(isCreatorDevice()).toBe(true);
    expect(await logEvent("app_visit")).toBe(false);
    expect(await logEvent("reminder_3")).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it("produces no events while a creator banner preview is active", async () => {
    window.localStorage.setItem("verbo.banner-preview.v1", "3");
    const sent = useTransport();
    expect(await logEvent("reminder_3")).toBe(false);
    expect(sent).toHaveLength(0);
  });
});

describe("failure handling", () => {
  it("never throws when the transport fails", async () => {
    setAnalyticsTransport(async () => {
      throw new Error("supabase unavailable");
    });
    await expect(logEvent("reminder_1")).resolves.toBe(false);
  });

  it("never throws when localStorage is unavailable", async () => {
    const spy = vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    await expect(logEvent("app_visit")).resolves.toBeDefined();
    spy.mockRestore();
  });
});

describe("server-side writer", () => {
  it("swallows database failures", async () => {
    vi.mock;
    const mod = await import("./payments.server");
    const spy = vi.spyOn(mod, "getSupabaseAdmin").mockImplementation(() => {
      throw new Error("no credentials");
    });
    await expect(
      recordTrialEvent({ deviceId: "device-aaaaaaa", event: "purchase_completed" }),
    ).resolves.toBe(false);
    spy.mockRestore();
  });

  it("counts distinct device ids, not rows", async () => {
    const mod = await import("./payments.server");
    const rows = [
      { device_id: "d1", event: "app_visit" },
      { device_id: "d1", event: "app_visit" },
      { device_id: "d2", event: "app_visit" },
      { device_id: "d2", event: "reminder_3" },
    ];
    const spy = vi.spyOn(mod, "getSupabaseAdmin").mockReturnValue({
      from: () => ({ select: async () => ({ data: rows, error: null }) }),
    } as never);

    const { counts, available } = await getFunnelCountsFromDb();
    expect(available).toBe(true);
    expect(counts.app_visit).toBe(2);
    expect(counts.reminder_3).toBe(1);
    expect(counts.purchase_completed).toBe(0);
    spy.mockRestore();
  });
});

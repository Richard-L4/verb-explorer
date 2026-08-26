import { beforeEach, describe, expect, it, vi } from "vitest";
import { isTestEvent, recordTrialEvent } from "./analytics.server";
import * as payments from "./payments.server";

function clearStorage() {
  window.localStorage.clear();
  document.cookie
    .split(";")
    .map((c) => c.split("=")[0]!.trim())
    .filter(Boolean)
    .forEach((name) => {
      document.cookie = `${name}=; path=/; max-age=0`;
    });
}

describe("server-side test-device guard", () => {
  it("flags explicit test payloads and test- prefixed device ids", () => {
    expect(isTestEvent({ deviceId: "9f2c-real-device", testDevice: true })).toBe(true);
    expect(isTestEvent({ deviceId: "test-9f2c-abc" })).toBe(true);
    expect(isTestEvent({ deviceId: "9f2c-real-device" })).toBe(false);
  });

  it("never touches the database for test traffic", async () => {
    const spy = vi.spyOn(payments, "getSupabaseAdmin");

    await expect(
      recordTrialEvent({ deviceId: "test-abcdefgh", event: "trial_expired" }),
    ).resolves.toBe(false);
    await expect(
      recordTrialEvent({ deviceId: "device-1234567", event: "checkout_started", testDevice: true }),
    ).resolves.toBe(false);

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("still writes genuine user events", async () => {
    const rows: unknown[] = [];
    const spy = vi.spyOn(payments, "getSupabaseAdmin").mockReturnValue({
      from: () => ({
        upsert: async (row: unknown) => {
          rows.push(row);
          return { error: null };
        },
      }),
    } as never);

    await expect(
      recordTrialEvent({ deviceId: "device-1234567", event: "app_visit", testDevice: false }),
    ).resolves.toBe(true);
    expect(rows).toHaveLength(1);
    spy.mockRestore();
  });
});

describe("sticky browser test marker", () => {
  beforeEach(() => {
    clearStorage();
    vi.resetModules();
  });

  it("survives Reset test state and Reset all progress", async () => {
    const access = await import("./access");
    access.enableCreatorAccess();
    expect(access.isTestDeviceLatched()).toBe(true);

    access.resetAccess();
    expect(access.isTestDeviceLatched()).toBe(true);

    // "Reset all progress" only clears learner keys; simulate the broadest case
    // of an app-level reset that leaves cookies intact.
    window.localStorage.removeItem("creator_access");
    window.localStorage.removeItem("verbo.access.v1");
    expect(access.isTestDeviceLatched()).toBe(true);
  });

  it("survives a localStorage-only clear via the cookie", async () => {
    const access = await import("./access");
    access.endTrial();
    window.localStorage.clear();
    expect(access.isTestDeviceLatched()).toBe(true);
  });

  it("suppresses logEvent and namespaces the device id once latched", async () => {
    const analytics = await import("./analytics");
    const sent: unknown[] = [];
    analytics.setAnalyticsTransport(async (p) => void sent.push(p));

    expect(await analytics.logEvent("app_visit")).toBe(true);
    expect(sent).toHaveLength(1);

    analytics.markTestDevice();
    expect(analytics.isTestDevice()).toBe(true);
    expect(analytics.getDeviceId()!.startsWith("test-")).toBe(true);
    expect(await analytics.logEvent("trial_expired", { trialDay: 0 })).toBe(false);
    expect(sent).toHaveLength(1);

    analytics.setAnalyticsTransport(null);
  });

  it("leaves an ordinary browser completely unaffected", async () => {
    const analytics = await import("./analytics");
    const sent: { deviceId: string; testDevice?: boolean }[] = [];
    analytics.setAnalyticsTransport(async (p) => void sent.push(p));

    expect(analytics.isTestDevice()).toBe(false);
    expect(await analytics.logEvent("trial_started", { trialDay: 14 })).toBe(true);
    expect(sent[0]!.deviceId.startsWith("test-")).toBe(false);
    expect(sent[0]!.testDevice).toBe(false);

    analytics.setAnalyticsTransport(null);
  });
});

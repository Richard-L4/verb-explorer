import { beforeEach, describe, expect, it, vi } from "vitest";
import { setAnalyticsTransport, type EventPayload } from "./analytics";

const sent: EventPayload[] = [];

beforeEach(() => {
  window.localStorage.clear();
  sent.length = 0;
  setAnalyticsTransport(async (payload) => {
    sent.push(payload);
  });
});

async function freshAccess() {
  // Fresh module instance so the internal `hydrated` flag resets.
  vi.resetModules();
  // The reset gives us a fresh analytics module too, so re-install the sink.
  const analytics = await import("./analytics");
  analytics.setAnalyticsTransport(async (payload) => {
    sent.push(payload);
  });
  return import("./access");
}

async function flush() {
  // The trial sync hops through two dynamic imports before falling back to
  // the local analytics path, so give the microtask/macrotask queues a moment.
  for (let i = 0; i < 10; i += 1) await new Promise((r) => setTimeout(r, 0));
}

describe("trial clock behaviour is unchanged", () => {
  it("starts a 14-day trial on first visit and reports 14 days left", async () => {
    const access = await freshAccess();
    access.hydrate();
    const state = access.getSnapshot();
    expect(state.trialStart).toBeTruthy();
    expect(state.unlocked).toBe(false);
    expect(access.trialDaysLeft(state)).toBe(access.TRIAL_DAYS);
    expect(access.trialActive(state)).toBe(true);
  });

  it("expires after the trial window", async () => {
    const access = await freshAccess();
    const started = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    expect(access.trialActive({ trialStart: started, unlocked: false, creator: false })).toBe(false);
    expect(access.trialDaysLeft({ trialStart: started, unlocked: false, creator: false })).toBe(0);
  });

  it("keeps the £4.99 price and 10 free cards", async () => {
    const access = await freshAccess();
    expect(access.UNLOCK_PRICE).toBe("£4.99");
    expect(access.FREE_CARD_COUNT).toBe(10);
    expect(access.TRIAL_DAYS).toBe(14);
  });
});

describe("trial_started analytics", () => {
  it("is recorded only when the trial clock is first created", async () => {
    const first = await freshAccess();
    first.hydrate();
    await flush();
    expect(sent.map((s) => s.event)).toEqual(["trial_started"]);

    // Second visit: clock already exists, so no further event.
    const second = await freshAccess();
    second.hydrate();
    await flush();
    expect(sent.map((s) => s.event)).toEqual(["trial_started"]);
  });

  it("is not recorded for creator devices", async () => {
    window.localStorage.setItem("creator_access", "true");
    const access = await freshAccess();
    access.hydrate();
    await flush();
    expect(sent).toHaveLength(0);
  });
});

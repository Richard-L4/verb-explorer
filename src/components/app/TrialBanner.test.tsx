import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { setAnalyticsTransport, type EventPayload } from "@/lib/analytics";

const access = {
  creator: false,
  unlocked: false,
  inTrial: true,
  trialDaysLeft: 7,
  price: "£4.99",
  bannerPreview: null as null | number | "expired",
};

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/unlock">{children}</a>,
}));

vi.mock("@/hooks/use-access", () => ({ useAccess: () => access }));

const { TrialBanner } = await import("./TrialBanner");

let sent: EventPayload[] = [];

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
  sent = [];
  setAnalyticsTransport(async (payload) => {
    sent.push(payload);
  });
  Object.assign(access, {
    creator: false,
    unlocked: false,
    inTrial: true,
    trialDaysLeft: 7,
    bannerPreview: null,
  });
});

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

describe("reminder events fire on actual render", () => {
  for (const days of [7, 3, 2, 1] as const) {
    it(`records reminder_${days} when the ${days}-day banner renders`, async () => {
      access.trialDaysLeft = days;
      render(<TrialBanner />);
      await flush();
      expect(screen.getByText(/full-access trial/i)).toBeTruthy();
      expect(sent.map((s) => s.event)).toEqual([`reminder_${days}`]);
      expect(sent[0]!.trialDay).toBe(days);
    });
  }

  it("records nothing on a day with no banner", async () => {
    access.trialDaysLeft = 9;
    render(<TrialBanner />);
    await flush();
    expect(sent).toHaveLength(0);
  });

  it("does not duplicate on repeated renders", async () => {
    access.trialDaysLeft = 3;
    render(<TrialBanner />);
    await flush();
    cleanup();
    render(<TrialBanner />);
    await flush();
    expect(sent.map((s) => s.event)).toEqual(["reminder_3"]);
  });
});

describe("trial_expired", () => {
  it("is recorded once when the trial first reaches zero", async () => {
    access.inTrial = false;
    access.trialDaysLeft = 0;
    render(<TrialBanner />);
    await flush();
    cleanup();
    render(<TrialBanner />);
    await flush();
    expect(sent.map((s) => s.event)).toEqual(["trial_expired"]);
  });

  it("is not recorded when the user has purchased", async () => {
    access.unlocked = true;
    access.inTrial = false;
    render(<TrialBanner />);
    await flush();
    expect(sent).toHaveLength(0);
  });
});

describe("creator mode", () => {
  it("records nothing for creator devices", async () => {
    window.localStorage.setItem("creator_access", "true");
    access.creator = true;
    access.trialDaysLeft = 3;
    render(<TrialBanner />);
    await flush();
    expect(sent).toHaveLength(0);
  });

  it("records nothing for the creator banner preview", async () => {
    window.localStorage.setItem("creator_access", "true");
    access.creator = true;
    access.bannerPreview = 1;
    render(<TrialBanner />);
    await flush();
    expect(screen.getByText("Preview")).toBeTruthy();
    expect(sent).toHaveLength(0);
  });
});

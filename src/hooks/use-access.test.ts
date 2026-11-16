import { describe, expect, it } from "vitest";
import { deriveAccess } from "./use-access";

const base = {
  localUnlocked: false,
  daysLeft: 7,
  trialCheck: "verified" as const,
  contentStatus: "unpaid" as const,
  contentRole: null,
  rawPreview: null,
};

describe("deriveAccess", () => {
  it("stale local creator flag without a valid server pass is not creator", () => {
    // Local flag is not an input at all: only the server role counts.
    const a = deriveAccess({ ...base, daysLeft: 0 });
    expect(a.creator).toBe(false);
    expect(a.fullAccess).toBe(false);
    expect(a.trialExpired).toBe(true);
  });

  it("invalid or expired creator pass (server unpaid) gives no creator access", () => {
    const a = deriveAccess({ ...base, daysLeft: 0, contentStatus: "unpaid", contentRole: null });
    expect(a.creator).toBe(false);
  });

  it("valid creator pass gives creator access", () => {
    const a = deriveAccess({ ...base, daysLeft: 0, contentStatus: "paid", contentRole: "creator" });
    expect(a.creator).toBe(true);
    expect(a.fullAccess).toBe(true);
  });

  it("cold start with an optimistic local clock is not a trial until the server confirms", () => {
    const a = deriveAccess({ ...base, daysLeft: 7, trialCheck: "checking", contentStatus: "checking" });
    expect(a.inTrial).toBe(false);
    expect(a.accessSettled).toBe(false);
    expect(a.fullAccess).toBe(false);
  });

  it("slow trial check keeps access unsettled even after content resolves", () => {
    const a = deriveAccess({ ...base, trialCheck: "checking", contentStatus: "unpaid" });
    expect(a.accessSettled).toBe(false);
    expect(a.inTrial).toBe(false);
  });

  it("expired repeat visitor (server moved clock back) is settled and expired", () => {
    const a = deriveAccess({ ...base, daysLeft: 0 });
    expect(a.accessSettled).toBe(true);
    expect(a.inTrial).toBe(false);
    expect(a.trialExpired).toBe(true);
  });

  it("confirmed active trial is in trial", () => {
    const a = deriveAccess({ ...base, daysLeft: 7, contentStatus: "paid", contentRole: "trial" });
    expect(a.inTrial).toBe(true);
    expect(a.accessSettled).toBe(true);
  });

  it("failed verification never invents a trial or reports expiry", () => {
    const a = deriveAccess({ ...base, daysLeft: 7, trialCheck: "failed" });
    expect(a.inTrial).toBe(false);
    expect(a.fullAccess).toBe(false);
    expect(a.trialExpired).toBe(false);
  });

  it("existing purchaser keeps access and is verified by the server pass", () => {
    const a = deriveAccess({ ...base, localUnlocked: true, daysLeft: 0, contentStatus: "paid", contentRole: "purchase" });
    expect(a.fullAccess).toBe(true);
    expect(a.verifiedPurchase).toBe(true);
    expect(a.creator).toBe(false);
  });

  it("local purchase flag alone is not a verified purchase", () => {
    const a = deriveAccess({ ...base, localUnlocked: true, contentStatus: "unpaid" });
    expect(a.verifiedPurchase).toBe(false);
  });
});

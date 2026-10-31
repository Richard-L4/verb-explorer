import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CLAIM_WINDOW_MINUTES, confirmAndClaim, markerHash, newClaimMarker, type ClaimDeps } from "./purchase-claim.server";

/** In-memory stand-in mirroring the claim_purchase SQL rules. */
async function setup(opts: { recorded?: boolean; preClaimed?: boolean } = {}) {
  const buyer = newClaimMarker();
  const hash = await markerHash(buyer);
  let now = 0;
  const row: { exists: boolean; claimedAt: number | null; owner: string | null } = {
    exists: !!opts.recorded || !!opts.preClaimed,
    claimedAt: opts.preClaimed ? 0 : null,
    owner: null,
  };
  let lock = Promise.resolve();
  const deps: ClaimDeps = {
    verifiedSession: async (id) => ({ id, metadata: { claim_hash: hash } }),
    purchaseExists: async () => row.exists,
    recordPurchase: async () => {
      row.exists = true;
    },
    claim: (_id, owner, mins) => {
      const run = lock.then(async () => {
        await new Promise((r) => setTimeout(r, 5));
        if (row.claimedAt === null) {
          row.claimedAt = now;
          row.owner = owner;
          return true;
        }
        return row.owner === owner && row.claimedAt > now - mins * 60_000;
      });
      lock = run.then(() => undefined);
      return run;
    },
  };
  return { deps, buyer, row, advance: (ms: number) => (now += ms) };
}

describe("one-time purchase claim", () => {
  it("first successful claim grants access", async () => {
    const { deps, buyer } = await setup();
    expect(await confirmAndClaim(deps, "cs_live_x", buyer)).toBe("done");
  });

  it("another browser using the same reference is sent to Restore", async () => {
    const { deps, buyer } = await setup();
    await confirmAndClaim(deps, "cs_live_x", buyer);
    expect(await confirmAndClaim(deps, "cs_live_x", newClaimMarker())).toBe("restore");
    expect(await confirmAndClaim(deps, "cs_live_x", undefined)).toBe("restore");
  });

  it("original browser can retry within 30 minutes but not after", async () => {
    const { deps, buyer, advance } = await setup();
    await confirmAndClaim(deps, "cs_live_x", buyer);
    advance((CLAIM_WINDOW_MINUTES - 1) * 60_000);
    expect(await confirmAndClaim(deps, "cs_live_x", buyer)).toBe("done");
    advance(2 * 60_000);
    expect(await confirmAndClaim(deps, "cs_live_x", buyer)).toBe("restore");
  });

  it("simultaneous claims cannot grant two browsers", async () => {
    const { deps, buyer } = await setup({ recorded: true });
    // The other browser forges a matching metadata hash to reach the claim step.
    const other = newClaimMarker();
    const otherHash = await markerHash(other);
    const otherDeps: ClaimDeps = { ...deps, verifiedSession: async (id) => ({ id, metadata: { claim_hash: otherHash } }) };
    const results = await Promise.all([confirmAndClaim(deps, "cs_live_x", buyer), confirmAndClaim(otherDeps, "cs_live_x", other)]);
    expect(results.filter((r) => r === "done")).toHaveLength(1);
  });

  it("existing purchases (pre-claimed by migration) cannot be reclaimed by link", async () => {
    const { deps, buyer } = await setup({ preClaimed: true });
    expect(await confirmAndClaim(deps, "cs_live_x", buyer)).toBe("restore");
  });

  it("a database failure does not consume the purchase", async () => {
    const { deps, buyer, row } = await setup();
    const failing: ClaimDeps = { ...deps, claim: async () => { throw new Error("db"); } };
    expect(await confirmAndClaim(failing, "cs_live_x", buyer)).toBe("pending");
    expect(row.claimedAt).toBeNull();
    expect(await confirmAndClaim(deps, "cs_live_x", buyer)).toBe("done");
  });

  it("checkout code no longer logs the payment reference", () => {
    const src = readFileSync("src/lib/checkout.functions.ts", "utf8");
    expect(src).not.toMatch(/console\.\w+\([^)]*session\.id/);
    expect(src).not.toMatch(/console\.\w+\([^)]*sessionId/);
  });

  it("success page clears the reference from the address bar", () => {
    const src = readFileSync("src/routes/unlock_.success.tsx", "utf8");
    expect(src).toContain("history.replaceState");
  });
});

describe("checkout lookup gate", () => {
  it("never asks Stripe without the browser marker", async () => {
    const { deps } = await setup({ recorded: true });
    let lookups = 0;
    const gated = { ...deps, verifiedSession: async (id: string) => (lookups++, deps.verifiedSession(id)) };
    expect(await confirmAndClaim(gated, "cs_test_abcdefghijk", undefined)).toBe("restore");
    expect(lookups).toBe(0);
  });

  it("never asks Stripe when the limit is reached, and returns pending", async () => {
    const { deps, buyer } = await setup({ recorded: true });
    let lookups = 0;
    const gated = {
      ...deps,
      allowLookup: async () => false,
      verifiedSession: async (id: string) => (lookups++, deps.verifiedSession(id)),
    };
    expect(await confirmAndClaim(gated, "cs_test_abcdefghijk", buyer)).toBe("pending");
    expect(lookups).toBe(0);
  });

  it("the buying browser can still retry within the window while allowed", async () => {
    const { deps, buyer, advance } = await setup({ recorded: true });
    const gated = { ...deps, allowLookup: async () => true };
    expect(await confirmAndClaim(gated, "cs_test_abcdefghijk", buyer)).toBe("done");
    advance(20 * 60_000);
    expect(await confirmAndClaim(gated, "cs_test_abcdefghijk", buyer)).toBe("done");
  });
});

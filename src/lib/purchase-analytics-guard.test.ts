import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { CHECKOUT_SESSION_ID_RE, isVerbWiseSession } from "./payments.server";
import { plausibleEventDate } from "./analytics.functions";

const PRICE = "price_live_verbwise";

function session(over: Partial<Stripe.Checkout.Session> = {}, items = [{ price: { id: PRICE }, quantity: 1 }]) {
  return {
    id: "cs_live_abcdefghijklmnop",
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    currency: "gbp",
    line_items: { data: items },
    ...over,
  } as unknown as Stripe.Checkout.Session;
}

describe("success-page purchase verification", () => {
  it("accepts a genuine paid Verb Wise unlock", () => {
    expect(isVerbWiseSession(session(), PRICE)).toBe(true);
  });

  it("rejects paid sessions for other prices or products in the same Stripe account", () => {
    expect(isVerbWiseSession(session({}, [{ price: { id: "price_other" }, quantity: 1 }]), PRICE)).toBe(false);
    expect(isVerbWiseSession(session({}, []), PRICE)).toBe(false);
    expect(
      isVerbWiseSession(session({}, [{ price: { id: PRICE }, quantity: 1 }, { price: { id: "price_x" }, quantity: 1 }]), PRICE),
    ).toBe(false);
    expect(isVerbWiseSession(session({}, [{ price: { id: PRICE }, quantity: 2 }]), PRICE)).toBe(false);
  });

  it("rejects unpaid, incomplete, subscription or wrong-currency sessions", () => {
    expect(isVerbWiseSession(session({ payment_status: "unpaid" }), PRICE)).toBe(false);
    expect(isVerbWiseSession(session({ status: "open" }), PRICE)).toBe(false);
    expect(isVerbWiseSession(session({ mode: "subscription" }), PRICE)).toBe(false);
    expect(isVerbWiseSession(session({ currency: "usd" }), PRICE)).toBe(false);
  });

  it("rejects malformed session IDs before any lookup", () => {
    expect(CHECKOUT_SESSION_ID_RE.test("cs_live_a1B2c3D4e5F6g7")).toBe(true);
    for (const bad of ["", "pi_123", "cs_live_", "cs_live_../../x", "cs_prod_abcdefghijkl"]) {
      expect(CHECKOUT_SESSION_ID_RE.test(bad)).toBe(false);
    }
  });
});

describe("analytics event guard", () => {
  const now = new Date("2026-10-31T12:00:00Z");
  it("accepts today and yesterday only", () => {
    expect(plausibleEventDate(undefined, now)).toBe(true);
    expect(plausibleEventDate("2026-10-31", now)).toBe(true);
    expect(plausibleEventDate("2026-10-30", now)).toBe(true);
    expect(plausibleEventDate("2026-10-01", now)).toBe(false);
    expect(plausibleEventDate("2027-01-01", now)).toBe(false);
  });
});

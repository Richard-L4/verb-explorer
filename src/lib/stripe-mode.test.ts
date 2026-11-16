import { afterEach, describe, expect, it, vi } from "vitest";
import {
  stripeConfigForMode,
  stripeConfigForRequest,
  stripeModeForHost,
  VERB_WISE_LIVE_PRICE_ID,
  VERB_WISE_TEST_PRICE_ID,
} from "./stripe-mode.server";
import { isVerbWiseSession } from "./payments.server";

const LIVE = "sk_live_" + "x".repeat(20);
const TEST = "sk_test_" + "y".repeat(20);
const both = (name: string) =>
  ({ STRIPE_SECRET_KEY: LIVE, STRIPE_SECRET_KEY_TEST: TEST } as Record<string, string>)[name];
const only = (vals: Record<string, string>) => (name: string) => vals[name];
const forHost = (host: string, env: (n: string) => string | undefined) =>
  stripeConfigForMode(stripeModeForHost(host), env);

describe("checkout and verification: mode selection by address", () => {
  it.each(["verb-wise.richard-wells.com", "verb-wise-flashcards.lovable.app"])(
    "production %s uses the live key and live price even when a test key exists",
    (host) => {
      const c = forHost(host, both);
      expect(c.mode).toBe("live");
      expect(c.secretKey).toBe(LIVE);
      expect(c.priceId).toBe(VERB_WISE_LIVE_PRICE_ID);
    },
  );

  it("production never reads STRIPE_SECRET_KEY_TEST", () => {
    const env = vi.fn(both);
    forHost("verb-wise.richard-wells.com", env);
    expect(env.mock.calls.map((c) => c[0])).not.toContain("STRIPE_SECRET_KEY_TEST");
  });

  it("production with only a test key fails instead of using test mode", () => {
    expect(() => forHost("verb-wise.richard-wells.com", only({ STRIPE_SECRET_KEY_TEST: TEST }))).toThrow(
      /STRIPE_SECRET_KEY is not configured/,
    );
  });

  it("production rejects a test key stored under the live name", () => {
    expect(() => forHost("verb-wise.richard-wells.com", only({ STRIPE_SECRET_KEY: TEST }))).toThrow(/live-mode/);
  });

  it.each([
    "id-preview--6380e654-32b7-41b1-ac5d-45a87ece7e8e.lovable.app",
    "preview--verb-wise-flashcards.lovable.app",
    "6380e654-32b7-41b1-ac5d-45a87ece7e8e.lovableproject.com",
    "localhost",
  ])("preview/local %s uses the test key and test price even when a live key exists", (host) => {
    const c = forHost(host, both);
    expect(c.mode).toBe("test");
    expect(c.secretKey).toBe(TEST);
    expect(c.priceId).toBe(VERB_WISE_TEST_PRICE_ID);
  });

  it("preview never reads STRIPE_SECRET_KEY", () => {
    const env = vi.fn(both);
    forHost("localhost", env);
    expect(env.mock.calls.map((c) => c[0])).not.toContain("STRIPE_SECRET_KEY");
  });

  it("preview with only a live key fails instead of using live mode", () => {
    expect(() => forHost("localhost", only({ STRIPE_SECRET_KEY: LIVE }))).toThrow(/STRIPE_SECRET_KEY_TEST is not configured/);
  });

  it("preview rejects a live key stored under the test name", () => {
    expect(() => forHost("localhost", only({ STRIPE_SECRET_KEY_TEST: LIVE }))).toThrow(/test-mode/);
  });

  it.each(["evil.example.com", "verb-wise.richard-wells.com.evil.com", "", "lovable.app"])(
    "unknown address %s gets no payment mode",
    (host) => {
      expect(() => stripeModeForHost(host)).toThrow(/not available/);
    },
  );

  it("forged forwarding headers cannot change the mode chosen from the request URL", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", LIVE);
    vi.stubEnv("STRIPE_SECRET_KEY_TEST", TEST);
    const req = new Request("https://verb-wise.richard-wells.com/api/public/stripe-webhook", {
      headers: { "x-forwarded-host": "localhost", forwarded: "host=localhost" },
    });
    expect((await stripeConfigForRequest(req)).mode).toBe("live");
    const preview = new Request("http://localhost:8080/x", {
      headers: { "x-forwarded-host": "verb-wise.richard-wells.com" },
    });
    expect((await stripeConfigForRequest(preview)).mode).toBe("test");
  });

  it("verification honours the mode's accepted prices and rejects others", () => {
    const session = (price: string) =>
      ({
        mode: "payment",
        status: "complete",
        payment_status: "paid",
        currency: "gbp",
        line_items: { data: [{ price: { id: price }, quantity: 1 }] },
      }) as never;
    const live = forHost("verb-wise.richard-wells.com", both);
    const test = forHost("localhost", both);
    expect(isVerbWiseSession(session(VERB_WISE_LIVE_PRICE_ID), live.acceptedPriceIds)).toBe(true);
    expect(isVerbWiseSession(session(VERB_WISE_TEST_PRICE_ID), live.acceptedPriceIds)).toBe(false);
    expect(isVerbWiseSession(session(VERB_WISE_LIVE_PRICE_ID), test.acceptedPriceIds)).toBe(false);
    expect(isVerbWiseSession(session("price_other"), live.acceptedPriceIds)).toBe(false);
  });
});

afterEach(() => vi.unstubAllEnvs());

describe("webhook: signing secret selection (unit level; no real Stripe delivery)", () => {
  it("live address uses only the live signing secret", () => {
    const c = forHost("verb-wise.richard-wells.com", only({
      STRIPE_SECRET_KEY: LIVE, STRIPE_WEBHOOK_SECRET: "whsec_live", STRIPE_TEST_WEBHOOK_SECRET: "whsec_test",
    }));
    expect(c.webhookSecret).toBe("whsec_live");
  });

  it("test address uses only the test signing secret", () => {
    const c = forHost("localhost", only({
      STRIPE_SECRET_KEY_TEST: TEST, STRIPE_WEBHOOK_SECRET: "whsec_live", STRIPE_TEST_WEBHOOK_SECRET: "whsec_test",
    }));
    expect(c.webhookSecret).toBe("whsec_test");
  });

  it("live address with only a test signing secret has no secret (rejected with 503)", () => {
    const c = forHost("verb-wise.richard-wells.com", only({ STRIPE_SECRET_KEY: LIVE, STRIPE_TEST_WEBHOOK_SECRET: "whsec_test" }));
    expect(c.webhookSecret).toBeUndefined();
  });
});

describe("£14.99 price change", () => {
  const live = stripeConfigForMode("live", (n) => (n === "STRIPE_SECRET_KEY" ? "sk_live_x" : undefined));
  const test = stripeConfigForMode("test", (n) => (n === "STRIPE_SECRET_KEY_TEST" ? "sk_test_x" : undefined));
  const s = (id: string) => ({
    mode: "payment", status: "complete", payment_status: "paid", currency: "gbp",
    line_items: { data: [{ price: { id }, quantity: 1 }] },
  }) as never;
  it("new checkouts use the £14.99 prices", () => {
    expect(live.priceId).toBe("price_1UcPeDJ7wpJmIRgY4WZc81xe");
    expect(test.priceId).toBe("price_1UcPaSQsnncBlv2AlKJutV3t");
  });
  it("accepts new £14.99 purchases in their own mode", () => {
    expect(isVerbWiseSession(s("price_1UcPeDJ7wpJmIRgY4WZc81xe"), live.acceptedPriceIds)).toBe(true);
    expect(isVerbWiseSession(s("price_1UcPaSQsnncBlv2AlKJutV3t"), test.acceptedPriceIds)).toBe(true);
  });
  it("still accepts legacy £4.99 purchases", () => {
    expect(isVerbWiseSession(s("price_1U66oMJ7wpJmIRgYHaLwO2VH"), live.acceptedPriceIds)).toBe(true);
    expect(isVerbWiseSession(s("price_1U6FgVQsnncBlv2AE3WrorZp"), test.acceptedPriceIds)).toBe(true);
  });
  it("rejects unrelated and cross-mode prices", () => {
    expect(isVerbWiseSession(s("price_unrelated"), live.acceptedPriceIds)).toBe(false);
    expect(isVerbWiseSession(s("price_1UcPaSQsnncBlv2AlKJutV3t"), live.acceptedPriceIds)).toBe(false);
    expect(isVerbWiseSession(s("price_1U6FgVQsnncBlv2AE3WrorZp"), live.acceptedPriceIds)).toBe(false);
    expect(isVerbWiseSession(s("price_1UcPeDJ7wpJmIRgY4WZc81xe"), test.acceptedPriceIds)).toBe(false);
  });
});

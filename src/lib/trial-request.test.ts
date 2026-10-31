// @vitest-environment node
import { describe, expect, it } from "vitest";
import { boundTrialRequest, TRIAL_BODY_MAX_BYTES } from "./trial-request.server";

const trialUrl = "/_serverFn/current-compiler-id";
const url = `https://example.test${trialUrl}`;
const post = (body: string, headers?: Record<string, string>) => new Request(url, { method: "POST", body, headers });

describe("trial-only pre-decoding byte cap", () => {
  it("allows a normal body and preserves its bytes and headers", async () => {
    const body = JSON.stringify({ device: { screen: "1920x1080", timezone: "Europe/London" } });
    const result = await boundTrialRequest(post(body, { "content-type": "application/json", cookie: "vw_vid=existing" }), trialUrl);
    expect(result).toBeInstanceOf(Request);
    if (!(result instanceof Request)) throw new Error("Expected request");
    expect(await result.text()).toBe(body);
    expect(result.headers.get("cookie")).toBe("vw_vid=existing");
  });

  it("accepts exactly 16384 bytes", async () => {
    expect(TRIAL_BODY_MAX_BYTES).toBe(16384);
    const result = await boundTrialRequest(post("x".repeat(16384)), trialUrl);
    expect(result).toBeInstanceOf(Request);
  });

  it("rejects 16385 bytes without a declared length", async () => {
    const result = await boundTrialRequest(post("x".repeat(16385)), trialUrl);
    expect(result).toBeInstanceOf(Response);
    if (!(result instanceof Response)) throw new Error("Expected rejection");
    expect(result.status).toBe(413);
  });

  it("counts UTF-8 bytes, not characters", async () => {
    const result = await boundTrialRequest(post("é".repeat(8193)), trialUrl);
    if (!(result instanceof Response)) throw new Error("Expected rejection");
    expect(result.status).toBe(413);
  });

  it("does not trust a small forged content length", async () => {
    const result = await boundTrialRequest(post("x".repeat(16385), { "content-length": "1" }), trialUrl);
    if (!(result instanceof Response)) throw new Error("Expected rejection");
    expect(result.status).toBe(413);
  });

  it("rejects an excessive declared length", async () => {
    const result = await boundTrialRequest(post("x", { "content-length": "16385" }), trialUrl);
    if (!(result instanceof Response)) throw new Error("Expected rejection");
    expect(result.status).toBe(413);
  });

  it("leaves all other functions, webhooks and GETs unconsumed", async () => {
    for (const path of ["/_serverFn/checkout-id", "/api/public/stripe-webhook"]) {
      const request = new Request(`https://example.test${path}`, { method: "POST", body: "x".repeat(20000) });
      expect(await boundTrialRequest(request, trialUrl)).toBe(request);
      expect(request.bodyUsed).toBe(false);
    }
    const get = new Request(url);
    expect(await boundTrialRequest(get, trialUrl)).toBe(get);
  });

  it("stops a chunked stream after crossing the cap", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(10000)); controller.enqueue(new Uint8Array(10000)); },
      cancel() { cancelled = true; },
    });
    const request = new Request(url, { method: "POST", body, duplex: "half" } as RequestInit);
    const result = await boundTrialRequest(request, trialUrl);
    if (!(result instanceof Response)) throw new Error("Expected rejection");
    expect(result.status).toBe(413);
    expect(cancelled).toBe(true);
  });
});
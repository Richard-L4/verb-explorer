import { describe, expect, it, vi } from "vitest";
import { maskEmail, mayCancel, maySave, ownerToken } from "./push-owner.server";

const SECRET = "test-secret-0123456789abcdef0123456789";
const A = { endpoint: "https://push.example.com/a", p256dh: "A".repeat(20), auth: "a".repeat(10) };
const B = { endpoint: "https://push.example.com/b", p256dh: "B".repeat(20), auth: "b".repeat(10) };
const storedA = { p256dh: A.p256dh, auth: A.auth };

describe("reminder ownership", () => {
  it("lets anyone register a brand-new address", async () => {
    expect(await maySave(SECRET, null, { endpoint: A.endpoint, cookieToken: null, ...A })).toBe(true);
  });

  it("stops another browser replacing an existing subscription", async () => {
    const tokenB = await ownerToken(SECRET, B.endpoint);
    expect(
      await maySave(SECRET, storedA, { endpoint: A.endpoint, cookieToken: tokenB, p256dh: B.p256dh, auth: B.auth }),
    ).toBe(false);
    expect(await maySave(SECRET, storedA, { endpoint: A.endpoint, cookieToken: null, p256dh: B.p256dh, auth: B.auth })).toBe(false);
    expect(await maySave(SECRET, storedA, { endpoint: A.endpoint, cookieToken: "forged", p256dh: B.p256dh, auth: B.auth })).toBe(false);
  });

  it("stops another browser cancelling reminders", async () => {
    const tokenB = await ownerToken(SECRET, B.endpoint);
    expect(await mayCancel(SECRET, storedA, { endpoint: A.endpoint, cookieToken: tokenB })).toBe(false);
    expect(await mayCancel(SECRET, storedA, { endpoint: A.endpoint, cookieToken: null })).toBe(false);
  });

  it("lets the owner update with its token, even with new keys", async () => {
    const tokenA = await ownerToken(SECRET, A.endpoint);
    expect(await maySave(SECRET, storedA, { endpoint: A.endpoint, cookieToken: tokenA, p256dh: B.p256dh, auth: B.auth })).toBe(true);
  });

  it("lets the owner cancel with its token", async () => {
    const tokenA = await ownerToken(SECRET, A.endpoint);
    expect(await mayCancel(SECRET, storedA, { endpoint: A.endpoint, cookieToken: tokenA })).toBe(true);
  });

  it("lets older subscriptions prove ownership with their own delivery keys", async () => {
    expect(await maySave(SECRET, storedA, { endpoint: A.endpoint, cookieToken: null, ...A })).toBe(true);
    expect(await mayCancel(SECRET, storedA, { endpoint: A.endpoint, cookieToken: null, p256dh: A.p256dh, auth: A.auth })).toBe(true);
  });

  it("cancelling an unknown address does nothing", async () => {
    expect(await mayCancel(SECRET, null, { endpoint: A.endpoint, cookieToken: null })).toBe(false);
  });

  it("token depends on the server secret, not just the address", async () => {
    expect(await ownerToken(SECRET, A.endpoint)).not.toBe(await ownerToken("other-secret-xxxxxxxxxxxxxxxx", A.endpoint));
  });
});

describe("customer email in logs", () => {
  it("masks the address", () => {
    expect(maskEmail("richard@example.com")).toBe("r•••@e•••.com");
    expect(maskEmail(null)).toBe("[redacted]");
  });

  it("the confirmation log never contains the full address", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const logs: string[] = [];
    const log = vi.spyOn(console, "log").mockImplementation((...a) => void logs.push(a.join(" ")));
    const { sendConfirmationEmail } = await import("./payments.server");
    await sendConfirmationEmail("buyer.person@example.com");
    expect(fetchSpy).toHaveBeenCalled();
    expect(logs.join("\n")).not.toContain("buyer.person@example.com");
    log.mockRestore();
    fetchSpy.mockRestore();
    vi.unstubAllEnvs();
  });
});

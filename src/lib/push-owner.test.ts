import { describe, expect, it, vi } from "vitest";
import { handleCancel, handleSave, mayCancel, maySave, ownerToken, reminderSecret, type StoredSubscription } from "./push-owner.server";
import { maskEmail, redact, safeError } from "./log-safety.server";
import { signPass, verifyPass } from "./content-pass.server";

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

describe("dedicated reminder secret", () => {
  it("is read only from REMINDER_OWNER_SECRET, with no fallback to the pass secret", () => {
    vi.stubEnv("REMINDER_OWNER_SECRET", "");
    vi.stubEnv("CONTENT_PASS_SECRET", "pass-secret-0123456789abcdef0123456789");
    expect(reminderSecret()).toBeNull();
    vi.stubEnv("REMINDER_OWNER_SECRET", SECRET);
    expect(reminderSecret()).toBe(SECRET);
    vi.unstubAllEnvs();
  });

  it("missing secret makes reminder saves and cancels fail safely without touching the database", async () => {
    const store = fakeStore();
    expect(await handleSave(null, store, A, null)).toEqual({ ok: false });
    expect(await handleCancel(null, store, { endpoint: A.endpoint }, null)).toEqual({ ok: false });
    expect(store.calls).toEqual([]);
  });

  it("a reminder token is not accepted as a purchase or creator pass", async () => {
    const PASS = "pass-secret-0123456789abcdef0123456789";
    const token = await ownerToken(SECRET, A.endpoint);
    expect(await verifyPass(token, PASS)).toBeNull();
    expect(await verifyPass(token, SECRET)).toBeNull();
    const pass = await signPass("creator", "fp", PASS);
    expect(await mayCancel(SECRET, storedA, { endpoint: A.endpoint, cookieToken: pass })).toBe(false);
  });
});

describe("customer email in logs", () => {
  const ADDR = "buyer.person@example.com";

  it("masks and redacts addresses", () => {
    expect(maskEmail("richard@example.com")).toBe("r•••@e•••.com");
    expect(maskEmail(null)).toBe("[redacted]");
    expect(redact(`Invalid recipient ${ADDR}, also ${ADDR.toUpperCase()}`)).not.toMatch(/@/);
  });

  it("safeError keeps type/code/status but no address or raw object", () => {
    const err = Object.assign(new Error(`duplicate for ${ADDR}`), {
      code: "23505", status: 409, details: `Key (email)=(${ADDR})`, raw: { customer_email: ADDR },
    });
    const out = safeError(err);
    expect(out).toEqual({ type: "Error", code: "23505", status: 409, message: "duplicate for [email]" });
    expect(JSON.stringify(out)).not.toContain(ADDR);
  });

  async function captureLogs(run: () => Promise<unknown>) {
    const lines: string[] = [];
    const push = (...a: unknown[]) => void lines.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
    const spies = (["log", "error", "warn", "info"] as const).map((m) => vi.spyOn(console, m).mockImplementation(push));
    try { await run(); } catch { /* path may throw by design */ }
    spies.forEach((s) => s.mockRestore());
    return lines.join("\n");
  }

  it("confirmation success log never contains the full address", async () => {
    vi.resetModules();
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const { sendConfirmationEmail } = await import("./payments.server");
    const logs = await captureLogs(() => sendConfirmationEmail(ADDR));
    expect(f).toHaveBeenCalled();
    expect(logs).toContain("Confirmation email sent");
    expect(logs).not.toContain(ADDR);
    f.mockRestore();
    vi.unstubAllEnvs();
  });

  it("provider error echoing the recipient is not logged in full", async () => {
    vi.resetModules();
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: `The ${ADDR} address is invalid`, to: ADDR }), { status: 422 }),
    );
    const { sendConfirmationEmail } = await import("./payments.server");
    const logs = await captureLogs(() => sendConfirmationEmail(ADDR));
    expect(logs).toContain("422");
    expect(logs).not.toContain(ADDR);
    f.mockRestore();
    vi.unstubAllEnvs();
  });
});

function fakeStore(initial: Record<string, StoredSubscription & { active: boolean }> = {}) {
  const rows = { ...initial };
  const calls: string[] = [];
  return {
    rows, calls,
    async find(endpoint: string) { calls.push("find"); const r = rows[endpoint]; return { row: r ? { p256dh: r.p256dh, auth: r.auth } : null, error: false }; },
    async upsert(row: { endpoint: string; p256dh: string; auth: string }) { calls.push("upsert"); rows[row.endpoint] = { p256dh: row.p256dh, auth: row.auth, active: true }; return true; },
    async deactivate(endpoint: string) { calls.push("deactivate"); rows[endpoint].active = false; return true; },
  };
}

describe("reminder flows with the dedicated secret", () => {
  it("create, modify and cancel by the owner", async () => {
    const store = fakeStore();
    const created = await handleSave(SECRET, store, A, null);
    expect(created.ok).toBe(true);
    const newKeys = { ...A, p256dh: "C".repeat(20), auth: "c".repeat(10) };
    expect((await handleSave(SECRET, store, newKeys, created.token)).ok).toBe(true);
    expect(store.rows[A.endpoint].p256dh).toBe("C".repeat(20));
    expect((await handleCancel(SECRET, store, { endpoint: A.endpoint }, created.token)).ok).toBe(true);
    expect(store.rows[A.endpoint].active).toBe(false);
  });

  it("another browser cannot modify or cancel", async () => {
    const store = fakeStore({ [A.endpoint]: { ...storedA, active: true } });
    const other = await handleSave(SECRET, store, B, null);
    const hijack = { endpoint: A.endpoint, p256dh: B.p256dh, auth: B.auth };
    expect((await handleSave(SECRET, store, hijack, other.token)).ok).toBe(false);
    expect((await handleCancel(SECRET, store, { endpoint: A.endpoint }, other.token)).ok).toBe(false);
    expect(store.rows[A.endpoint]).toEqual({ ...storedA, active: true });
  });

  it("tokens made with the old shared secret no longer work, but owners regain access with their delivery keys", async () => {
    const OLD = "pass-secret-0123456789abcdef0123456789";
    const store = fakeStore({ [A.endpoint]: { ...storedA, active: true } });
    const oldToken = await ownerToken(OLD, A.endpoint);
    expect((await handleCancel(SECRET, store, { endpoint: A.endpoint }, oldToken)).ok).toBe(false);
    const regained = await handleSave(SECRET, store, A, oldToken);
    expect(regained.ok).toBe(true);
    expect(regained.token).toBe(await ownerToken(SECRET, A.endpoint));
  });
});

describe("payment and email log calls stay sanitised", () => {
  it("no console call logs a raw error object, .message or provider response", async () => {
    const { readFileSync } = await import("node:fs");
    const files = ["src/lib/payments.server.ts", "src/lib/checkout.functions.ts", "src/routes/api/public/stripe-webhook.ts"];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const calls = src.match(/console\.(log|error|warn|info)\([\s\S]*?\);/g) ?? [];
      expect(calls.length).toBeGreaterThan(0);
      for (const c of calls) {
        expect(c, `${f}: ${c}`).not.toMatch(/\.message\b|,\s*(error|err|e|body|lastError|email)\s*[,)]/);
      }
    }
  });
});

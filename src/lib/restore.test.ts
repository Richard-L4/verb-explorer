import { describe, expect, it, vi } from "vitest";
import {
  CODE_TTL_MS,
  creatorAttemptAllowed,
  requestRestoreCode,
  verifyRestoreCode,
  type CodeRow,
  type CodeStore,
} from "./restore.server";

const SECRET = "unit-test-secret-not-real";

function memoryStore(): CodeStore & { rows: CodeRow[] } {
  const rows: CodeRow[] = [];
  let id = 0;
  let tick = 0;
  return {
    rows,
    async countSince(f, since) {
      return rows.filter(
        (r) =>
          r.purpose === f.purpose &&
          r.created_at >= since &&
          (!f.email_hash || r.email_hash === f.email_hash) &&
          (!f.network_hash || r.network_hash === f.network_hash),
      ).length;
    },
    async insert(row) {
      tick += 1;
      rows.push({ ...row, id: String(++id), attempts: 0, used_at: null, created_at: new Date(Date.now() + tick).toISOString() });
    },
    async latestActive(purpose, email_hash, nowIso) {
      return (
        rows
          .filter((r) => r.purpose === purpose && r.email_hash === email_hash && !r.used_at && r.expires_at > nowIso)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
      );
    },
    async bumpAttempts(rid, attempts) {
      rows.find((r) => r.id === rid)!.attempts = attempts;
    },
    async consume(rid, nowIso) {
      const r = rows.find((x) => x.id === rid)!;
      if (r.used_at) return false;
      r.used_at = nowIso;
      return true;
    },
  };
}

function setup(buyer = "buyer@example.com") {
  const store = memoryStore();
  const sendCode = vi.fn(async () => {});
  let next = "123456";
  const deps = {
    store,
    secret: SECRET,
    hasPurchase: async (e: string) => e === buyer,
    sendCode,
    randomCode: () => next,
  };
  return { store, sendCode, deps, setNext: (c: string) => (next = c) };
}

describe("restore by email", () => {
  it("sends a code to a buyer and verifies it once", async () => {
    const { deps, sendCode } = setup();
    expect(await requestRestoreCode(deps, "Buyer@Example.com ", "1.1.1.1")).toEqual({ sent: true });
    expect(sendCode).toHaveBeenCalledWith("buyer@example.com", "123456");
    expect(await verifyRestoreCode(deps, "buyer@example.com", "123456")).toBe(true);
    expect(await verifyRestoreCode(deps, "buyer@example.com", "123456")).toBe(false); // single use
  });

  it("gives non-buyers the same answer, sends nothing, and their row can't verify", async () => {
    const { deps, sendCode } = setup();
    expect(await requestRestoreCode(deps, "nobody@example.com", "1.1.1.1")).toEqual({ sent: true });
    expect(sendCode).not.toHaveBeenCalled();
    expect(await verifyRestoreCode(deps, "nobody@example.com", "123456")).toBe(false);
  });

  it("stores no email or code in clear", async () => {
    const { deps, store } = setup();
    await requestRestoreCode(deps, "buyer@example.com", "9.9.9.9");
    const dump = JSON.stringify(store.rows);
    expect(dump).not.toContain("buyer@example.com");
    expect(dump).not.toContain("123456");
    expect(dump).not.toContain("9.9.9.9");
  });

  it("rejects a wrong code and locks after 5 attempts", async () => {
    const { deps } = setup();
    await requestRestoreCode(deps, "buyer@example.com", null);
    for (let i = 0; i < 5; i += 1) expect(await verifyRestoreCode(deps, "buyer@example.com", "000000")).toBe(false);
    expect(await verifyRestoreCode(deps, "buyer@example.com", "123456")).toBe(false);
  });

  it("rejects an expired code", async () => {
    const { deps } = setup();
    await requestRestoreCode(deps, "buyer@example.com", null);
    const later = { ...deps, now: () => Date.now() + CODE_TTL_MS + 1000 };
    expect(await verifyRestoreCode(later, "buyer@example.com", "123456")).toBe(false);
  });

  it("rate-limits to 3 requests per email per hour", async () => {
    const { deps, sendCode } = setup();
    for (let i = 0; i < 5; i += 1) await requestRestoreCode(deps, "buyer@example.com", null);
    expect(sendCode).toHaveBeenCalledTimes(3);
  });

  it("rate-limits to 10 requests per network per hour", async () => {
    const { deps, store } = setup();
    for (let i = 0; i < 14; i += 1) await requestRestoreCode(deps, `x${i}@example.com`, "2.2.2.2");
    expect(store.rows).toHaveLength(10);
  });

  it("rejects a code if the purchase no longer exists", async () => {
    const { deps } = setup();
    await requestRestoreCode(deps, "buyer@example.com", null);
    expect(await verifyRestoreCode({ ...deps, hasPurchase: async () => false }, "buyer@example.com", "123456")).toBe(false);
  });

  it("rejects malformed codes without touching storage", async () => {
    const { deps } = setup();
    expect(await verifyRestoreCode(deps, "buyer@example.com", "12ab56")).toBe(false);
  });
});

describe("creator attempt rate limit", () => {
  it("allows 10 attempts per network per hour", async () => {
    const store = memoryStore();
    const results = [];
    for (let i = 0; i < 12; i += 1) results.push(await creatorAttemptAllowed(store, SECRET, "3.3.3.3"));
    expect(results.filter(Boolean)).toHaveLength(10);
  });
});

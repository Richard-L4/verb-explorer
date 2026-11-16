/** Full content: purchase/creator pass or active server trial; everyone else gets SER vs ESTAR only. */
import { describe, expect, it } from "vitest";
import { resolveEntitlement, type EntitlementDeps } from "./entitlement.server";
import { readFileSync } from "node:fs";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-16T12:00:00Z");
const deps = (o: Partial<EntitlementDeps> = {}): EntitlementDeps => ({
  passRole: async () => null,
  trialStart: async () => null,
  trialDays: 7,
  now: () => NOW,
  ...o,
});
const ago = (d: number) => async () => new Date(NOW - d * DAY).toISOString();

describe("trial", () => {
  it("new user (day 0) gets everything, ending in 7 days", async () => {
    const r = await resolveEntitlement(null, deps({ trialStart: ago(0) }));
    expect(r).toEqual({ full: true, role: "trial", accessUntil: new Date(NOW + 7 * DAY).toISOString() });
  });
  it("day 6 still full", async () => expect((await resolveEntitlement(null, deps({ trialStart: ago(6.9) }))).full).toBe(true));
  it("exactly 7 days later: free collection only", async () =>
    expect(await resolveEntitlement(null, deps({ trialStart: ago(7) }))).toEqual({ full: false, role: null, accessUntil: null }));
  it("first visit long after expiry: free collection only, without needing a trial visit", async () =>
    expect((await resolveEntitlement(null, deps({ trialStart: ago(90) }))).full).toBe(false));
  it("no trial record: free collection only", async () => expect((await resolveEntitlement(null, deps())).full).toBe(false));
  it("database failure fails closed", async () =>
    expect((await resolveEntitlement(null, deps({ trialStart: async () => { throw new Error("db"); } }))).full).toBe(false));
  it("future or malformed start is rejected", async () => {
    expect((await resolveEntitlement(null, deps({ trialStart: async () => "nonsense" }))).full).toBe(false);
    expect((await resolveEntitlement(null, deps({ trialStart: ago(-1) }))).full).toBe(false);
  });
});

describe("purchases", () => {
  it.each(["purchase", "creator"] as const)("%s pass: full lifetime access, no end date", async (role) => {
    const r = await resolveEntitlement("tok", deps({ passRole: async () => role, trialStart: ago(400) }));
    expect(r).toEqual({ full: true, role, accessUntil: null });
  });
  it("revoked or forged pass after the trial: free collection only", async () =>
    expect((await resolveEntitlement("forged", deps({ trialStart: ago(30) }))).full).toBe(false));
  it("pass check throwing falls back to the trial check, not to access", async () => {
    const r = await resolveEntitlement("tok", deps({ passRole: async () => { throw new Error("x"); }, trialStart: ago(30) }));
    expect(r.full).toBe(false);
  });
});

describe("server function wiring", () => {
  const fns = readFileSync("src/lib/subjunctive-content.functions.ts", "utf8");
  it("decides through resolveEntitlement and returns nothing protected otherwise", () => {
    expect(fns).toMatch(/resolveEntitlement\(/);
    expect(fns).toMatch(/if \(!ent\.full\) return \{ paid: false as const, role: null, accessUntil: null, entries: null, imperfect: null, verbs: null, sayings: null \}/);
  });
  it("ignores browser claims: only `pass` is read from input", () => {
    expect(fns).toMatch(/z\.object\(\{ pass: z\.string\(\)\.max\(2048\)\.nullable\(\)\.optional\(\) \}\)/);
  });
});

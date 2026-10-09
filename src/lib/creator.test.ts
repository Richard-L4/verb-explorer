import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { creatorFingerprint, passRole, signPass, PASS_TTL, type EntitlementChecks } from "./content-pass.server";

const SECRET = "unit-test-pass-secret";
const KEY = "creator-key-for-tests";

const checks = (over: Partial<EntitlementChecks> = {}): EntitlementChecks => ({
  sessionPaid: async () => true,
  emailPaid: async () => true,
  isPreviewRequest: () => false,
  creatorFingerprint: async () => creatorFingerprint(KEY, SECRET),
  ...over,
});

describe("creator pass", () => {
  it("valid creator pass has the creator role", async () => {
    const p = await signPass("creator", await creatorFingerprint(KEY, SECRET), SECRET);
    expect(await passRole(p, checks(), SECRET)).toBe("creator");
  });
  it("is revoked when the creator key changes", async () => {
    const p = await signPass("creator", await creatorFingerprint("old-key", SECRET), SECRET);
    expect(await passRole(p, checks(), SECRET)).toBeNull();
  });
  it("is rejected when no creator key is configured", async () => {
    const p = await signPass("creator", await creatorFingerprint(KEY, SECRET), SECRET);
    expect(await passRole(p, checks({ creatorFingerprint: async () => null }), SECRET)).toBeNull();
  });
  it("expires after 30 days", async () => {
    const issued = Date.now() - PASS_TTL.creator - 1000;
    const p = await signPass("creator", await creatorFingerprint(KEY, SECRET), SECRET, issued);
    expect(await passRole(p, checks(), SECRET)).toBeNull();
  });
  it("cannot be forged by editing the payload", async () => {
    const p = await signPass("cs", "cs_x", SECRET);
    const [, sig] = p.split(".");
    const body = Buffer.from(
      JSON.stringify({ k: "creator", r: await creatorFingerprint(KEY, SECRET), iat: 1, exp: Date.now() + 1e9 }),
    ).toString("base64url");
    expect(await passRole(`${body}.${sig}`, checks(), SECRET)).toBeNull();
  });
  it("a purchase pass never has the creator role", async () => {
    expect(await passRole(await signPass("cs", "cs_x", SECRET), checks(), SECRET)).toBe("purchase");
    expect(await passRole(await signPass("email", "a@b.c", SECRET), checks(), SECRET)).toBe("purchase");
  });
  it("an expired purchase pass is rejected", async () => {
    const p = await signPass("cs", "cs_x", SECRET, Date.now() - PASS_TTL.cs - 1000);
    expect(await passRole(p, checks(), SECRET)).toBeNull();
  });
});

describe("creator code is not in browser code", () => {
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  }
  it("the old public code no longer appears anywhere in src", () => {
    const hits = walk("src").filter((f) => readFileSync(f, "utf8").includes("hilary" + "53"));
    expect(hits).toEqual([]);
  });
  it("CREATOR_ACCESS_KEY is only read in server handlers", () => {
    const hits = walk("src")
      .filter((f) => !/\.test\.tsx?$/.test(f))
      .filter((f) => readFileSync(f, "utf8").includes("CREATOR_ACCESS_KEY"));
    expect(hits.sort()).toEqual(["src/lib/content-checks.server.ts", "src/lib/creator.functions.ts"]);
  });
});

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import raw from "@/data/subjunctive.json";
import publicJson from "@/data/subjunctive.public.json";
import { cards } from "@/data/cards";
import type { SubjunctiveEntry } from "@/data/subjunctive";
import {
  FREE_SUBJUNCTIVE_IDS,
  canViewSubjunctive,
  isFreeSubjunctive,
  randomSubjunctivePool,
  verbCardLocked,
  type PublicSubjunctiveEntry,
} from "./content-access";
import { buildPublicSubjunctive } from "./subjunctive-public-build";
import { advance, nextRun, shuffle } from "./random-sequence";
import { passGrantsAccess, signPass, verifyPass } from "./content-pass.server";

const full = raw as SubjunctiveEntry[];
const pub = publicJson as PublicSubjunctiveEntry[];

describe("standard verbs", () => {
  it("all 100 verb cards are open to everyone", () => {
    expect(cards).toHaveLength(100);
    expect(cards.every((c) => !verbCardLocked(c.id))).toBe(true);
  });
});

describe("free subjunctive set", () => {
  it("is exactly the approved 20 ids", () => {
    expect([...FREE_SUBJUNCTIVE_IDS]).toEqual(full.slice(0, 20).map((e) => e.id));
    expect(FREE_SUBJUNCTIVE_IDS[0]).toBe("ser-vs-estar");
    expect(FREE_SUBJUNCTIVE_IDS[19]).toBe("encontrar-vs-buscar");
    expect(new Set(FREE_SUBJUNCTIVE_IDS).size).toBe(20);
  });
  it("unpaid: Easy open only for the free 20", () => {
    expect(canViewSubjunctive("ser-vs-estar", "easy", false)).toBe(true);
    expect(canViewSubjunctive(full[20]!.id, "easy", false)).toBe(false);
  });
  it("unpaid: Medium and Hard locked everywhere, including free entries", () => {
    for (const e of full) {
      expect(canViewSubjunctive(e.id, "medium", false)).toBe(false);
      expect(canViewSubjunctive(e.id, "hard", false)).toBe(false);
    }
  });
  it("paid: everything open", () => {
    expect(full.every((e) => canViewSubjunctive(e.id, "hard", true))).toBe(true);
  });
});

describe("public subjunctive file", () => {
  it("matches the derivation from the untouched original", () => {
    expect(pub).toEqual(buildPublicSubjunctive(full));
  });
  it("has titles for all 100 and content for only the free 20", () => {
    expect(pub).toHaveLength(100);
    const withContent = pub.filter((e) => e.triggers);
    expect(withContent.map((e) => e.id)).toEqual([...FREE_SUBJUNCTIVE_IDS]);
    pub.filter((e) => !e.triggers).forEach((e) => expect(Object.keys(e).sort()).toEqual(["id", "title"]));
  });
  it("each free entry has 3 triggers with exactly the one Easy example", () => {
    for (const e of pub.filter((x) => x.triggers)) {
      expect(e.triggers).toHaveLength(3);
      for (const t of e.triggers!) {
        expect(t.examples.map((x) => x.difficulty)).toEqual(["easy"]);
      }
    }
  });
  it("contains no Medium or Hard sentence, and nothing from the locked 80", () => {
    const text = JSON.stringify(pub);
    for (const e of full) {
      for (const t of e.triggers) {
        for (const x of t.examples) {
          const allowed = x.difficulty === "easy" && isFreeSubjunctive(e.id);
          if (!allowed) expect(text.includes(JSON.stringify(x.es))).toBe(false);
        }
        if (!isFreeSubjunctive(e.id)) expect(text.includes(JSON.stringify(t.explanation))).toBe(false);
      }
    }
  });
});

describe("full dataset never reaches browser code", () => {
  const allowed = new Set(["src/lib/subjunctive-full.server.ts"]);
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  }
  it("only the server module imports subjunctive.json", () => {
    const offenders = walk("src")
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) && !allowed.has(f))
      .filter((f) => /subjunctive\.json["']/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
  it("the server module is only loaded dynamically inside a server handler", () => {
    const fns = readFileSync("src/lib/subjunctive-content.functions.ts", "utf8");
    expect(fns).not.toMatch(/^import .*subjunctive-full/m);
    expect(fns).toMatch(/await import\("\.\/subjunctive-full\.server"\)/);
  });
});

describe("random subjunctive pool", () => {
  const ids = full.map((e) => e.id);
  it("unpaid pool is exactly the free 20", () => {
    expect(randomSubjunctivePool(ids, false)).toEqual([...FREE_SUBJUNCTIVE_IDS]);
  });
  it("paid pool is all 100", () => expect(randomSubjunctivePool(ids, true)).toHaveLength(100));
});

describe("random sequence", () => {
  const pool = Array.from({ length: 100 }, (_, i) => i);
  it("a run contains every item once", () => {
    const run = shuffle(pool);
    expect(new Set(run).size).toBe(100);
    expect(run).toHaveLength(100);
  });
  it("stepping inside a run never reshuffles", () => {
    const q = shuffle(pool);
    expect(advance(q, 10, pool)).toBe(q);
  });
  it("past the end appends a fresh run without repeating the last item", () => {
    for (let k = 0; k < 50; k += 1) {
      const q = shuffle([1, 2, 3]);
      const out = advance(q, 2, [1, 2, 3]);
      expect(out.slice(0, 3)).toEqual(q);
      expect(out[3]).not.toBe(q[2]);
      expect(new Set(out.slice(3)).size).toBe(3);
    }
  });
  it("nextRun keeps a single-item pool", () => expect(nextRun([7], 7)).toEqual([7]));
});

describe("purchase pass", () => {
  const secret = "test-secret-value-for-unit-tests-only";
  const yes = async () => true;
  const no = async () => false;
  const checks = { sessionPaid: yes, emailPaid: yes, paymentIntentPaid: yes, isPreviewRequest: () => false };

  it("rejects missing, garbage and tampered passes", async () => {
    expect(await passGrantsAccess("", checks, secret)).toBe(false);
    expect(await passGrantsAccess("abc.def", checks, secret)).toBe(false);
    const good = await signPass("cs", "cs_test_1", secret);
    const [body, sig] = good.split(".");
    const forged = Buffer.from(JSON.stringify({ k: "cs", r: "cs_other", iat: 1 })).toString("base64url");
    expect(await passGrantsAccess(`${forged}.${sig}`, checks, secret)).toBe(false);
    expect(await passGrantsAccess(`${body}.${sig}x`, checks, secret)).toBe(false);
  });
  it("rejects a pass signed with another secret", async () => {
    const other = await signPass("cs", "cs_test_1", "a-different-secret-entirely");
    expect(await verifyPass(other, secret)).toBeNull();
  });
  it("accepts a valid pass only while the purchase still exists", async () => {
    const good = await signPass("cs", "cs_test_1", secret);
    expect(await passGrantsAccess(good, checks, secret)).toBe(true);
    expect(await passGrantsAccess(good, { ...checks, sessionPaid: no }, secret)).toBe(false);
  });
  it("preview pass only works on a preview request", async () => {
    const p = await signPass("preview", "preview", secret);
    expect(await passGrantsAccess(p, checks, secret)).toBe(false);
    expect(await passGrantsAccess(p, { ...checks, isPreviewRequest: () => true }, secret)).toBe(true);
  });
});

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
  sayingLocked,
  type PublicSubjunctiveEntry,
} from "./content-access";
import { buildPublicSubjunctive } from "./subjunctive-public-build";
import { advance, nextRun, shuffle } from "./random-sequence";
import { passGrantsAccess, signPass, verifyPass } from "./content-pass.server";

const full = raw as SubjunctiveEntry[];
const pub = publicJson as PublicSubjunctiveEntry[];

describe("standard verbs", () => {
  it("after the trial only the SER vs ESTAR card is open", () => {
    expect(cards).toHaveLength(100);
    expect(cards.filter((c) => !verbCardLocked(c.id, false)).map((c) => c.id)).toEqual(["ser-vs-estar"]);
  });
  it("trial or purchase opens all 100 cards", () => {
    expect(cards.every((c) => !verbCardLocked(c.id, true))).toBe(true);
  });
  it("sayings are locked after the trial and open with full access", () => {
    expect(sayingLocked("any", false)).toBe(true);
    expect(sayingLocked("any", true)).toBe(false);
  });
});

describe("free subjunctive set", () => {
  it("is only SER vs ESTAR", () => {
    expect([...FREE_SUBJUNCTIVE_IDS]).toEqual(["ser-vs-estar"]);
  });
  it("unpaid: SER vs ESTAR open at every level", () => {
    for (const d of ["easy", "medium", "hard"] as const) expect(canViewSubjunctive("ser-vs-estar", d, false)).toBe(true);
  });
  it("unpaid: every other entry locked at every level", () => {
    for (const e of full.filter((x) => x.id !== "ser-vs-estar"))
      for (const d of ["easy", "medium", "hard"] as const) expect(canViewSubjunctive(e.id, d, false)).toBe(false);
  });
  it("paid: everything open", () => {
    expect(full.every((e) => canViewSubjunctive(e.id, "hard", true))).toBe(true);
  });
});

describe("public subjunctive file", () => {
  it("matches the derivation from the untouched original", () => {
    expect(pub).toEqual(buildPublicSubjunctive(full));
  });
  it("has titles for all 100 and content for SER vs ESTAR only", () => {
    expect(pub).toHaveLength(100);
    const withContent = pub.filter((e) => e.triggers);
    expect(withContent.map((e) => e.id)).toEqual([...FREE_SUBJUNCTIVE_IDS]);
    pub
      .filter((e) => !e.triggers)
      .forEach((e) => expect(Object.keys(e).sort()).toEqual(["id", "title"]));
  });
  it("the free entry carries every level, unchanged from the original", () => {
    const free = pub.find((x) => x.triggers)!;
    expect(free.triggers).toEqual(full.find((e) => e.id === "ser-vs-estar")!.triggers);
  });
  it("contains nothing from the locked 99", () => {
    const text = JSON.stringify(pub);
    const freeExplanations = new Set(
      full
        .filter((e) => isFreeSubjunctive(e.id))
        .flatMap((e) => e.triggers.map((t) => t.explanation)),
    );
    for (const e of full) {
      for (const t of e.triggers) {
        for (const x of t.examples) {
          const allowed = isFreeSubjunctive(e.id);
          if (!allowed) expect(text.includes(JSON.stringify(x.es))).toBe(false);
        }
        // Generic explanations shared with a free entry are legitimately public.
        if (!isFreeSubjunctive(e.id) && !freeExplanations.has(t.explanation))
          expect(text.includes(JSON.stringify(t.explanation))).toBe(false);
      }
    }
  });
});

describe("full dataset never reaches browser code", () => {
  const allowed = new Set(["src/lib/subjunctive-full.server.ts", "src/lib/imperfect-subjunctive-full.server.ts"]);
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
    expect(fns).not.toMatch(/^import .*imperfect-subjunctive-full/m);
    expect(fns).toMatch(/await import\("\.\/imperfect-subjunctive-full\.server"\)/);
  });
});

describe("automatic pass", () => {
  it("never accepts a browser-supplied identifier", () => {
    const fns = readFileSync("src/lib/subjunctive-content.functions.ts", "utf8");
    const auto = fns.slice(fns.indexOf("export const requestAutomaticPass"));
    expect(auto).not.toMatch(/inputValidator|deviceId|data\./);
  });
});

describe("random subjunctive pool", () => {
  const ids = full.map((e) => e.id);
  it("unpaid pool is SER vs ESTAR only", () => {
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
  const checks = {
    sessionPaid: yes,
    emailPaid: yes,
    creatorFingerprint: async () => null,
    isPreviewRequest: () => false,
  };

  it("rejects missing, garbage and tampered passes", async () => {
    expect(await passGrantsAccess("", checks, secret)).toBe(false);
    expect(await passGrantsAccess("abc.def", checks, secret)).toBe(false);
    const good = await signPass("cs", "cs_test_1", secret);
    const [body, sig] = good.split(".");
    const forged = Buffer.from(JSON.stringify({ k: "cs", r: "cs_other", iat: 1 })).toString(
      "base64url",
    );
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
    expect(await passGrantsAccess(p, { ...checks, isPreviewRequest: () => true }, secret)).toBe(
      true,
    );
  });
});

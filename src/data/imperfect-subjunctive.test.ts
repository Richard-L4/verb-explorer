import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { entryProblems, type SubjunctiveEntry } from "./subjunctive";
import imperfectRaw from "./imperfect-subjunctive.json";
import presentRaw from "./subjunctive.json";
import imperfectPublic from "./imperfect-subjunctive.public.json";
import { getCard } from "./cards";
import { FREE_SUBJUNCTIVE_IDS, filterEntryForAccess } from "@/lib/content-access";
import { buildPublicSubjunctive } from "@/lib/subjunctive-public-build";

const imperfect = imperfectRaw as SubjunctiveEntry[];
const present = presentRaw as SubjunctiveEntry[];

describe("imperfect subjunctive data", () => {
  it("is the supplied file, byte for byte", () => {
    const h = createHash("sha256").update(readFileSync("src/data/imperfect-subjunctive.json")).digest("hex");
    expect(h).toBe(IMPERFECT_SHA);
  });
  it("has 100 unique entries matching the verb deck and the present section", () => {
    expect(imperfect).toHaveLength(100);
    expect(new Set(imperfect.map((e) => e.id)).size).toBe(100);
    expect(imperfect.every((e) => getCard(e.id))).toBe(true);
    expect(imperfect.map((e) => e.id)).toEqual(present.map((e) => e.id));
  });
  it("every entry is complete (3 triggers x 3 examples)", () => {
    expect(imperfect.flatMap((e) => entryProblems(e))).toEqual([]);
  });
});

describe("imperfect public file", () => {
  it("is exactly what unpaid visitors may see", () => {
    expect(imperfectPublic).toEqual(buildPublicSubjunctive(imperfect));
  });
  it("uses the same 20 free ids, Easy only; others are title-only", () => {
    const free = new Set<string>(FREE_SUBJUNCTIVE_IDS);
    for (const e of imperfectPublic as ReturnType<typeof filterEntryForAccess>[]) {
      if (free.has(e.id)) {
        expect(e.triggers?.flatMap((t) => t.examples).every((x) => x.difficulty === "easy")).toBe(true);
      } else {
        expect(Object.keys(e).sort()).toEqual(["id", "title"]);
      }
    }
  });
  it("contains no locked example text", () => {
    const text = JSON.stringify(imperfectPublic);
    const free = new Set<string>(FREE_SUBJUNCTIVE_IDS);
    for (const e of imperfect)
      for (const t of e.triggers)
        for (const x of t.examples)
          if (!free.has(e.id) || x.difficulty !== "easy") expect(text.includes(x.es)).toBe(false);
  });
});

const IMPERFECT_SHA = "20d0197e988ff3779a1ae83bed6184d52f4b3383b79c9531f3eb8dc9bfb5d120";

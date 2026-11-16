import { beforeAll, describe, expect, it } from "vitest";
import publicSayings from "./sayings.public.json";
import { fullSayings } from "@/lib/sayings-full.server";
import { buildPublicSayings, type NorthAmericanSource } from "@/lib/sayings-build";
import rawBritish from "./sayings.json";
import source from "./northAmericanExpressions.json";
import {
  sayings,
  sayingCount,
  sayingCountByRegion,
  sayingsInRegion,
  getSaying,
  getSayingNeighbours,
  getSayingIndex,
  searchSayings,
  regionCategories,
  setSayingContent,
} from "./sayings";

// These checks describe the full collection as a trial or paying user receives it.
beforeAll(() => setSayingContent(fullSayings));

describe("sayings public file (after the trial)", () => {
  it("is exactly the derivation from the untouched sources", () => {
    expect(publicSayings).toEqual(buildPublicSayings(rawBritish, source as unknown as NorthAmericanSource));
  });
  it("has names only: no meanings, Spanish equivalents or examples", () => {
    const text = JSON.stringify(publicSayings.sayings);
    for (const s of fullSayings) {
      for (const v of [s.meaning, s.spanish, s.exampleSpanish, s.exampleEnglish, s.vibe, s.literal_fail])
        if (v) expect(text.includes(JSON.stringify(v))).toBe(false);
      for (const ex of s.examples ?? []) expect(text.includes(JSON.stringify(ex.es))).toBe(false);
    }
  });
});

describe("sayings collection", () => {
  it("has 75 expressions, 25 per region, unique ids", () => {
    expect(sayingCount).toBe(75);
    expect(sayingCountByRegion).toEqual({ british: 25, american: 25, canadian: 25 });
    expect(new Set(sayings.map((s) => s.id)).size).toBe(75);
  });

  it("keeps the British 25 identical and in order", () => {
    const british = sayingsInRegion("british").map(({ region: _r, ...rest }) => rest);
    expect(british).toEqual(rawBritish);
  });

  it.each(["american", "canadian"] as const)("keeps every %s entry exactly as the source, in order", (region) => {
    const cards = sayingsInRegion(region);
    const entries = source.collections[region];
    expect(cards.map((c) => c.id)).toEqual(entries.map((e) => e.id));
    entries.forEach((e, i) => {
      const c = cards[i]!;
      expect([c.title, c.meaning, c.spanish, c.status, c.verificationNote, c.exampleEnglish, c.exampleSpanish]).toEqual([
        e.english, e.meaning, e.spanish, e.status, e.verificationNote, e.exampleEnglish, e.exampleSpanish,
      ]);
      expect(regionCategories(region).some((cat) => cat.id === e.category)).toBe(true);
    });
  });

  it("keeps DLE and DLE (partial) distinct", () => {
    const statuses = new Set(sayings.map((s) => s.status).filter(Boolean));
    expect(statuses.has("DLE")).toBe(true);
    expect(statuses.has("DLE (partial)")).toBe(true);
  });

  it("keeps prev/next inside the region", () => {
    const lastBritish = sayingsInRegion("british").at(-1)!;
    const firstAmerican = sayingsInRegion("american")[0]!;
    const lastAmerican = sayingsInRegion("american").at(-1)!;
    expect(getSayingNeighbours(lastBritish.id).next).toBeUndefined();
    expect(getSayingNeighbours(firstAmerican.id).prev).toBeUndefined();
    expect(getSayingNeighbours(lastAmerican.id).next).toBeUndefined();
    expect(getSayingNeighbours(sayingsInRegion("canadian")[0]!.id).prev).toBeUndefined();
    expect(getSayingIndex(firstAmerican.id)).toBe(0);
  });

  it("finds American and Canadian expressions by search", () => {
    expect(searchSayings("tell me about it").map((s) => s.id)).toContain("us_001");
    expect(searchSayings("echar el resto").map((s) => s.id)).toContain("ca_001");
    expect(getSaying("ca_001")?.region).toBe("canadian");
  });
});

/**
 * After the trial the browser holds only the SER vs ESTAR card in full; other cards
 * are names only. The full deck and full sayings never enter browser code.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import fullJson from "@/data/verbs.json";
import publicJson from "@/data/verbs.public.json";
import type { VerbCard } from "@/data/cards";
import { buildPublicVerbs } from "./verbs-public-build";

const full = fullJson as VerbCard[];
const pub = publicJson as VerbCard[];

describe("public verb deck", () => {
  it("is exactly the derivation from the untouched original", () => expect(pub).toEqual(buildPublicVerbs(full)));
  it("keeps all 100 names in order", () => expect(pub.map((c) => c.id)).toEqual(full.map((c) => c.id)));
  it("carries SER vs ESTAR in full", () =>
    expect(pub.find((c) => c.id === "ser-vs-estar")).toEqual(full.find((c) => c.id === "ser-vs-estar")));
  it("contains no example, explanation or tricky note from the other 99", () => {
    const text = JSON.stringify(pub);
    for (const c of full.filter((x) => x.id !== "ser-vs-estar")) {
      if (c.tricky) expect(text.includes(JSON.stringify(c.tricky))).toBe(false);
      for (const s of c.sides ?? []) {
        if (s.core) expect(text.includes(JSON.stringify(s.core))).toBe(false);
        for (const ex of s.examples ?? []) expect(text.includes(JSON.stringify(ex.es))).toBe(false);
      }
    }
  });
});

describe("full content never reaches browser code", () => {
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  }
  const src = walk("src").filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f));
  it.each([
    [/verbs\.json["']/, ["src/lib/verbs-full.server.ts"]],
    [/sayings\.json["']/, ["src/lib/sayings-full.server.ts"]],
    [/northAmericanExpressions\.json["']/, ["src/lib/sayings-full.server.ts"]],
  ])("%s is imported only by its server module", (re, allowed) => {
    expect(src.filter((f) => re.test(readFileSync(f, "utf8")))).toEqual(allowed);
  });
  it("server modules are loaded only dynamically inside the handler", () => {
    const fns = readFileSync("src/lib/subjunctive-content.functions.ts", "utf8");
    expect(fns).not.toMatch(/^import .*(verbs|sayings)-full/m);
    expect(fns).toMatch(/await import\("\.\/verbs-full\.server"\)/);
    expect(fns).toMatch(/await import\("\.\/sayings-full\.server"\)/);
  });
  it("full content is never written to browser storage", () => {
    const store = readFileSync("src/hooks/use-subjunctive.ts", "utf8");
    expect(store).not.toMatch(/localStorage|sessionStorage|indexedDB/);
  });
});

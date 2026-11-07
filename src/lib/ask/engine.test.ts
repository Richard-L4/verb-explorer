/**
 * Tests for the Ask engine: brief examples, verb pairs, clarification, fallbacks,
 * that every link points to a real entry, and that locked content is never used.
 */
import { describe, expect, it } from "vitest";
import { ask, type AskData } from "./engine";
import { normalise } from "./normalise";
import { cards } from "@/data/cards";
import { publicSubjunctive, publicImperfectSubjunctive } from "@/data/subjunctive-public";
import { readFileSync } from "node:fs";

const data: AskData = { cards, present: publicSubjunctive, imperfect: publicImperfectSubjunctive };
const run = (q: string) => ask(q, data);
const area = (q: string) => {
  const r = run(q);
  return r.kind === "answer" ? r.area : r.kind;
};

describe("normalise", () => {
  it("removes fillers and repeats but keeps negation", () => {
    expect(normalise("Um, er, I I don't think he's right")).toBe("i do not think he is right");
  });
  it("keeps what follows a self-correction", () => {
    expect(normalise("I think he is, no wait, I don't think he is coming")).toBe("i do not think he is coming");
  });
});

describe("grammar intent", () => {
  it.each([
    ["I think he is right.", "indicative"],
    ["I don't think he is right.", "present"],
    ["I hope he comes tomorrow.", "present"],
    ["I know he is coming.", "indicative"],
    ["I want him to come.", "present"],
    ["I wish I had more time.", "imperfect"],
    ["I wanted you to be happy", "imperfect"],
    ["I doubt she will come", "present"],
    ["Creo que tiene razón", "indicative"],
    ["No creo que tenga razón", "present"],
    ["Espero que venga mañana", "present"],
    ["Ojalá tuviera más tiempo", "imperfect"],
    ["Quería que vinieras", "imperfect"],
    ["Er, how would I say, um, I don't think he was there yesterday, because, well, I wasn't really sure?", "imperfect"],
  ])("%s → %s", (q, expected) => expect(area(q)).toBe(expected));

  it("a negative word flips the answer", () => {
    expect(area("I think it is true")).toBe("indicative");
    expect(area("I don't think it is true")).toBe("present");
  });
});

describe("verb pairs", () => {
  it.each([
    ["ser or estar?", "ser-vs-estar"],
    ["when do I use por and para", "por-vs-para"],
    ["fue vs era", "fue-vs-era"],
    ["saber or conocer", "saber-vs-conocer"],
  ])("%s → %s", (q, id) => {
    const r = run(q);
    expect(r.kind).toBe("answer");
    if (r.kind === "answer") expect(r.link.params).toEqual({ cardId: id });
  });
});

describe("refuses to guess", () => {
  it("asks for clarification on 'I was'", () => expect(area("How do I say 'I was' in Spanish?")).toBe("clarify"));
  it("unknown verb", () => {
    const r = run("what does the verb ladrar mean");
    expect(r.kind).toBe("fallback");
    if (r.kind === "fallback") expect(r.title).toBe("Sorry, that verb isn't currently listed in Verb Wise.");
  });
  it("uncovered topic", () => expect(area("how do I order a pizza")).toBe("fallback"));
  it("'want to' is not a different-subject wish", () => expect(area("I want to sleep")).toBe("fallback"));
  it("empty", () => expect(area("  um  ")).toBe("empty"));
});

describe("links and access", () => {
  const queries = ["I don't think he is right", "I wish I had more time", "ser or estar", "I hope he comes", "I think so"];
  it("every link points at a real entry", () => {
    for (const q of queries) {
      const r = run(q);
      if (r.kind !== "answer") continue;
      const p = r.link.params as Record<string, string>;
      const id = p["cardId"] ?? p["entryId"];
      const list = r.link.to === "/card/$cardId" ? cards : r.link.to.includes("imperfect") ? publicImperfectSubjunctive : publicSubjunctive;
      expect(list.some((e) => e.id === id)).toBe(true);
    }
  });
  it("free users only ever see free Easy examples", () => {
    const full = JSON.parse(readFileSync("src/data/subjunctive.json", "utf8")) as { triggers: { examples: { es: string; difficulty: string }[] }[] }[];
    const publicEs = new Set(publicSubjunctive.flatMap((e) => (e.triggers ?? []).flatMap((t) => t.examples.map((x) => x.es))));
    const lockedEs = full.flatMap((e) => e.triggers.flatMap((t) => t.examples.map((x) => x.es))).filter((s) => !publicEs.has(s));
    for (const q of [...queries, "I doubt it", "Quiero que vengas", "Espero que llueva"]) {
      const r = run(q);
      if (r.kind === "answer" && r.es) expect(lockedEs).not.toContain(r.es);
    }
  });
});

describe("verb recognition against the real deck", () => {
  const cardId = (q: string) => {
    const r = run(q);
    return r.kind === "answer" && r.link.to === "/card/$cardId" ? r.link.params.cardId : r.kind;
  };
  const notListed = (q: string) => {
    const r = run(q);
    return r.kind === "fallback" && r.title.startsWith("Sorry, that verb");
  };
  it("A: desperdicio maps to desperdiciar, which is not in the deck", () => {
    expect(cards.some((c) => c.sides?.some((s) => s.word.includes("desperdiciar")))).toBe(false);
    expect(notListed("desperdicio de agua")).toBe(true);
  });
  it("B: pérdida de tiempo opens the perder card with a labelled extra note", () => {
    const r = run("pérdida de tiempo");
    expect(r.kind === "answer" && r.link.to === "/card/$cardId" && r.link.params.cardId).toBe("perder-vs-faltar");
    expect(r.kind === "answer" && r.extra).toMatch(/waste of time/);
  });
  it("C: conjugated pierdo opens the perder card", () => {
    expect(cardId("pierdo las llaves")).toBe("perder-vs-faltar");
  });
  it("D: a deck verb with no matching lesson still shows its card", () => {
    expect(cardId("siempre pierde el autobús")).toBe("perder-vs-faltar");
    expect(notListed("siempre pierde el autobús")).toBe(false);
  });
  it("E: one listed verb plus an unlisted one shows the listed card", () => {
    expect(cardId("pierdo o desperdicio el dinero")).toBe("perder-vs-faltar");
  });
  it("F: a made-up verb gives the not-listed message", () => {
    expect(notListed("what does zorbular mean")).toBe(true);
  });
  it("does not accept an ending guess that is not a real headword", () => {
    expect(notListed("la casa es grande")).toBe(false);
    expect(cardId("caminamos mucho")).not.toBe("perder-vs-faltar");
  });
});

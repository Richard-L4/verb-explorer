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

describe("generalised composite question resolution", () => {
  it("handles a misspelling and a coinage in one complete English question", () => {
    const r = run("is it desperdida or desperjucio");
    expect(r.kind).toBe("nearest");
    if (r.kind !== "nearest") return;
    expect(r.corrections?.[0]).toMatchObject({ original: "desperdida", corrected: "pérdida" });
    expect(r.unlisted?.[0]).toMatchObject({ term: "desperjucio", verb: "desperdiciar" });
    expect(r.unlisted?.[0]?.note).toContain("desperdicio");
    expect(r.options.some((o) => (o.link.params as { cardId: string }).cardId === "perder-vs-faltar")).toBe(true);
  });

  it("handles the same comparison in a full Spanish carrier frame without choosing por", () => {
    const r = run("por qué decimos desperdicio de agua y no desperdida");
    expect(r.kind).toBe("nearest");
    if (r.kind !== "nearest") return;
    expect(r.corrections?.[0]?.corrected).toBe("pérdida");
    expect(r.unlisted?.[0]?.verb).toBe("desperdiciar");
    expect(r.options.some((o) => (o.link.params as { cardId: string }).cardId === "perder-vs-faltar")).toBe(true);
    expect(r.options.some((o) => (o.link.params as { cardId: string }).cardId === "por-vs-para")).toBe(false);
  });

  it("explains a same-root verb versus noun contrast using the perder lesson", () => {
    const r = run("pierdo o pérdida");
    expect(r.kind).toBe("answer");
    if (r.kind !== "answer") return;
    expect(r.link.params).toEqual({ cardId: "perder-vs-faltar" });
    expect(r.distinction).toContain("verb form");
    expect(r.distinction).toContain("noun");
  });

  it("keeps an off-pack notice alongside a directly recognised lesson", () => {
    const r = run("pierdo o desperdicio el dinero");
    expect(r.kind).toBe("answer");
    if (r.kind !== "answer") return;
    expect(r.link.params).toEqual({ cardId: "perder-vs-faltar" });
    expect(r.unlisted?.[0]?.verb).toBe("desperdiciar");
  });

  it("reports a real off-pack verb without declaring unknown words incorrect", () => {
    const known = run("what does cocinar mean");
    expect(known.kind).toBe("fallback");
    if (known.kind === "fallback") expect(known.message).toContain("to cook");
    const unknown = run("what does zorbular mean");
    expect(unknown.kind).toBe("fallback");
    if (unknown.kind === "fallback") expect(unknown.message).not.toContain("does not exist");
  });

  it("does not coin corrections without contrast and verified root evidence", () => {
    const alone = run("desperdida");
    expect(alone.kind).not.toBe("answer");
    if (alone.kind === "nearest" || alone.kind === "answer") expect(alone.corrections).toBeUndefined();
    const realWord = run("desconocido o conocido");
    if (realWord.kind === "nearest" || realWord.kind === "answer") expect(realWord.corrections).toBeUndefined();
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

describe("learner-friendly wording for made-up words", () => {
  const all = (r: ReturnType<typeof run>) => JSON.stringify(r);
  it("explains a made-up word plainly and never says coinage", () => {
    const r = run("is it desperdida or desperjucio");
    if (r.kind !== "nearest") throw new Error("expected nearest");
    const c = r.corrections?.[0]?.explanation ?? "";
    expect(c).toContain("looks like a word formed by mistake");
    expect(c).toContain("Did you mean “pérdida” (loss), from perder?");
    expect(all(r)).not.toMatch(/coinage/i);
  });
  it("gives the suggestion's own meaning without equating it to desperdicio", () => {
    const r = run("por qué decimos desperdicio de agua y no desperdida");
    if (r.kind !== "nearest") throw new Error("expected nearest");
    const reason = r.options.map((o) => o.reason).join(" ");
    expect(reason).toContain("looks closest to “pérdida” (loss), from perder");
    expect(reason).toContain("not a word with the same meaning");
    expect(reason).not.toMatch(/desperdicio[^.]*same meaning|same meaning[^.]*desperdicio/);
  });
  it("keeps the learner's own capitalisation in quotes", () => {
    const r = run("is it Desperdida or desperjucio");
    if (r.kind !== "nearest") throw new Error("expected nearest");
    expect(r.corrections?.[0]?.explanation).toContain("The word “Desperdida” looks like");
  });
  it("fills the common-mistake message with the real form and verb", () => {
    const r = run("hacido");
    const text = (r.kind === "nearest" || r.kind === "answer") ? (r.corrections ?? []).map((c) => c.explanation).join(" ") : "";
    expect(text).toMatch(/is a common mistake: Spanish uses “hecho” from hacer; the nearest lesson is only a suggestion\./);
    expect(text).not.toMatch(/“X”|from Y\b/);
  });
});

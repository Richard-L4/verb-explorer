/** Tests for generalised form recognition, learner errors, fuzzy matching and homographs. */
import { describe, expect, it } from "vitest";
import { ask, type AskData } from "./engine";
import { editDistance } from "./match";
import { cards } from "@/data/cards";
import { publicSubjunctive, publicImperfectSubjunctive } from "@/data/subjunctive-public";

const data: AskData = { cards, present: publicSubjunctive, imperfect: publicImperfectSubjunctive };
const run = (q: string) => ask(q, data);
const cardOf = (q: string) => {
  const r = run(q);
  return r.kind === "answer" && r.link.to === "/card/$cardId" ? r.link.params.cardId : r.kind;
};
const nearestCards = (q: string) => {
  const r = run(q);
  return r.kind === "nearest" ? r.options.map((o) => (o.link.params as { cardId: string }).cardId) : [r.kind];
};
const cardsWith = (verb: string) => cards.filter((c) => (c.sides ?? []).some((s) => s.word.toLowerCase().split(/[\s/]+/).includes(verb))).map((c) => c.id);

describe("edit distance", () => {
  it("counts transpositions as one edit", () => expect(editDistance("hbalar", "hablar", 2)).toBe(1));
});

describe("regular forms from card infinitives", () => {
  it.each(["hablamos", "hablaban", "trabajamos", "escuchaba", "olvidamos"])("%s opens a card for its verb", (w) => {
    const verb = { hablamos: "hablar", hablaban: "hablar", trabajamos: "trabajar", escuchaba: "escuchar", olvidamos: "olvidar" }[w]!;
    const r = run(w);
    const ids = cardsWith(verb);
    if (r.kind === "answer") expect(ids).toContain((r.link.params as { cardId: string }).cardId);
    else expect(r.kind).toBe("clarify");
  });
  it("does not invent regular forms for irregular verbs", () => expect(cardOf("sido")).not.toBe("ser-vs-estar"));
});

describe("learner errors and spelling", () => {
  it("sabo suggests saber with the correction", () => {
    const r = run("sabo");
    expect(r.kind).toBe("nearest");
    if (r.kind === "nearest") expect(r.options[0]!.reason).toContain("sé");
  });
  it("ponido suggests puesto", () => {
    const r = run("ponido");
    expect(r.kind === "nearest" && r.options[0]!.reason.includes("puesto")).toBe(true);
  });
  it("kerer is offered as nearest, never a definite answer", () => {
    expect(nearestCards("kerer").some((id) => cardsWith("querer").includes(id))).toBe(true);
  });
  it("conosco is offered as nearest for conocer", () => {
    expect(nearestCards("conosco").some((id) => cardsWith("conocer").includes(id))).toBe(true);
  });
});

describe("homographs", () => {
  it("vino on its own is never a definite answer", () => expect(run("vino").kind).not.toBe("answer"));
  it("banco on its own is never a definite answer", () => expect(run("banco").kind).not.toBe("answer"));
  it("él vino ayer opens a venir card", () => expect(cardsWith("venir")).toContain(cardOf("él vino ayer")));
});

describe("no false matches", () => {
  it.each(["cocinar", "nadar", "what's the weather like", "football scores"])("%s is not a definite card answer", (q) => {
    expect(run(q).kind).not.toBe("answer");
  });
});

describe("all cards", () => {
  it("every card infinitive resolves to a card that contains it", () => {
    for (const c of cards)
      for (const s of c.sides ?? []) {
        const w = s.word.toLowerCase();
        if (!/^[a-zñáéíóú]+(?:ar|er|ir|se)$/.test(w)) continue;
        const r = run(w);
        expect(["answer", "clarify"]).toContain(r.kind);
      }
  });
});

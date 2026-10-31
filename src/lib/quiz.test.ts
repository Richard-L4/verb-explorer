import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import full from "@/data/quiz.json";
import pub from "@/data/quiz.public.json";
import { FREE_QUIZ_IDS_AFTER_TRIAL, quizLevelLocked } from "./content-access";
import { buildPublicQuiz, type QuizQuestion } from "./quiz-public-build";
import { resolveQuiz, type QuizDeps } from "./quiz.server";
import { IMPERFECT_QUIZ_IDS, quizTense } from "./quiz-tense";
import { answer, isFinished, newRound, next, quizPool, QUIZ_STORAGE_KEY } from "./quiz-session";

const bank = full as QuizQuestion[];
const ids = (qs: { id: string }[]) => qs.map((q) => q.id);
const DAY = 86_400_000;
const NOW = Date.parse("2026-10-10T12:00:00Z");

function deps(over: Partial<QuizDeps> = {}): QuizDeps {
  return {
    passRole: async () => null,
    trialStart: async () => null,
    bank: async () => bank,
    trialDays: 7,
    now: () => NOW,
    ...over,
  };
}

describe("question bank integrity", () => {
  it("master file is byte-identical to the supplied bank", () => {
    const h = createHash("sha256").update(readFileSync("src/data/quiz.json")).digest("hex");
    expect(h).toBe("9608904c09e72c15bf822186fa37756808abf67047069e011eaf3230b1569280");
  });
  it("has 150 unique ids q001–q150, valid fields, one correct option each", () => {
    expect(ids(bank)).toEqual(Array.from({ length: 150 }, (_, i) => `q${String(i + 1).padStart(3, "0")}`));
    for (const q of bank) {
      expect(["verbs", "subjunctive"]).toContain(q.category);
      expect(["easy", "medium", "hard"]).toContain(q.difficulty);
      expect(q.options).toHaveLength(4);
      expect(q.options.filter((o) => o.correct)).toHaveLength(1);
    }
  });
  it("public file = first 20 Easy questions in file order (15 verbs + 5 subjunctive)", () => {
    const expected = bank.filter((q) => q.difficulty === "easy").slice(0, 20);
    expect(pub).toEqual(expected);
    expect(pub).toEqual(buildPublicQuiz(bank));
    expect(ids(pub)).toEqual([...FREE_QUIZ_IDS_AFTER_TRIAL]);
    expect(pub.filter((q) => q.category === "verbs" && q.difficulty === "easy")).toHaveLength(15);
    expect(pub.filter((q) => q.category === "subjunctive" && q.difficulty === "easy")).toHaveLength(5);
  });
  it("no restricted question text appears in the public file", () => {
    const text = JSON.stringify(pub);
    const restricted = bank.filter((q) => !(FREE_QUIZ_IDS_AFTER_TRIAL as readonly string[]).includes(q.id));
    expect(restricted).toHaveLength(130);
    for (const q of restricted) expect(text.includes(q.question)).toBe(false);
  });
});

describe("access tiers (real server decision path)", () => {
  it("purchase pass: all 150", async () => {
    const r = await resolveQuiz({ pass: "p" }, deps({ passRole: async () => "purchase" }));
    expect(r.tier).toBe("full");
    expect(r.questions).toHaveLength(150);
  });
  it("creator pass: all 150", async () => {
    const r = await resolveQuiz({ pass: "p" }, deps({ passRole: async () => "creator" }));
    expect(r.questions).toHaveLength(150);
  });
  it("active trial: 50 verbs + 15 Easy present + 10 Easy imperfect = 75", async () => {
    const r = await resolveQuiz({}, deps({ trialStart: async () => new Date(NOW - 3 * DAY).toISOString() }));
    expect(r.tier).toBe("trial");
    expect(r.questions).toHaveLength(75);
    expect(r.questions.filter((q) => q.category === "verbs")).toHaveLength(50);
    const subj = r.questions.filter((q) => q.category === "subjunctive");
    expect(subj.filter((q) => quizTense(q) === "present")).toHaveLength(15);
    expect(subj.filter((q) => quizTense(q) === "imperfect")).toHaveLength(10);
    expect(subj.every((q) => q.difficulty === "easy")).toBe(true);
  });
  it.each([
    ["expired trial", deps({ trialStart: async () => new Date(NOW - 7 * DAY).toISOString() })],
    ["no trial cookie", deps()],
    ["database failure", deps({ trialStart: async () => { throw new Error("db down"); } })],
    ["future/malformed trial start", deps({ trialStart: async () => "not-a-date" })],
  ])("%s: only the public 20", async (_n, d) => {
    const r = await resolveQuiz({}, d);
    expect(r.tier).toBe("public");
    expect(ids(r.questions)).toEqual([...FREE_QUIZ_IDS_AFTER_TRIAL]);
  });
  it.each([
    ["forged pass", { pass: "forged.token" }],
    ["malformed pass", { pass: 12345 }],
    ["oversized pass", { pass: "x".repeat(5000) }],
    ["forged paid/trial/tier fields", { paid: true, trial: true, tier: "full", unlocked: true, role: "creator" }],
  ])("%s: no extra questions", async (_n, body) => {
    const r = await resolveQuiz(body, deps({ passRole: async (p) => (p === "valid" ? "purchase" : null) }));
    expect(ids(r.questions)).toEqual([...FREE_QUIZ_IDS_AFTER_TRIAL]);
  });
  it("pass check throwing fails closed", async () => {
    const r = await resolveQuiz({ pass: "p" }, deps({ passRole: async () => { throw new Error("x"); } }));
    expect(r.questions).toHaveLength(20);
  });
});

describe("mix and session", () => {
  it("mix never exceeds the authorised pool and includes both categories", () => {
    const easyMix = quizPool(pub as QuizQuestion[], "mix", "easy");
    expect(easyMix).toHaveLength(20);
    expect(new Set(easyMix.map((q) => q.category)).size).toBe(2);
    expect(quizPool(pub as QuizQuestion[], "mix", "hard")).toHaveLength(0);
  });
  it("a round has no repeats and finishes after every question", () => {
    const pool = quizPool(bank, "verbs", "medium");
    let r = newRound(pool);
    expect(new Set(r.order).size).toBe(pool.length);
    for (let i = 0; i < pool.length; i++) r = next(answer(r, 0, true));
    expect(isFinished(r)).toBe(true);
    expect(r.score).toBe(pool.length);
  });
  it("cannot answer the same question twice", () => {
    const r = answer(answer(newRound(bank.slice(0, 3)), 1, true), 2, true);
    expect(r.answered).toBe(1);
    expect(r.score).toBe(1);
  });
  it("restart / new choice gives a fresh round", () => {
    const r = newRound(quizPool(bank, "subjunctive", "hard", "present"));
    expect(r.index).toBe(0);
    expect(r.score).toBe(0);
    expect(r.order).toHaveLength(15);
  });
  it("locked levels match the tiers", () => {
    expect(quizLevelLocked("verbs", "medium", "public")).toBe(true);
    expect(quizLevelLocked("verbs", "hard", "trial")).toBe(false);
    expect(quizLevelLocked("subjunctive", "medium", "trial")).toBe(true);
    expect(quizLevelLocked("mix", "hard", "full")).toBe(false);
  });
  it("quiz storage is separate from flashcard/trial keys", () => {
    expect(QUIZ_STORAGE_KEY).toBe("vw_quiz_best_v1");
  });
});

describe("imperfect subjunctive classification", () => {
  const old = JSON.parse(readFileSync("src/data/quiz.json", "utf8")) as QuizQuestion[];
  it("the central list is exactly q101–q150", () => {
    expect([...IMPERFECT_QUIZ_IDS]).toEqual(Array.from({ length: 50 }, (_, i) => `q${101 + i}`));
  });
  it("all 50 are subjunctive questions classified as imperfect", () => {
    const imp = bank.filter((q) => quizTense(q) === "imperfect");
    expect(ids(imp)).toEqual([...IMPERFECT_QUIZ_IDS]);
    expect(imp.every((q) => q.category === "subjunctive")).toBe(true);
    expect(imp.filter((q) => q.difficulty === "easy")).toHaveLength(10);
  });
  it("every other subjunctive question is present; verbs have no tense", () => {
    expect(bank.filter((q) => quizTense(q) === "present")).toHaveLength(50);
    expect(bank.filter((q) => q.category === "verbs").every((q) => quizTense(q) === null)).toBe(true);
  });
  it("the original 100 questions are unchanged from the earlier bank", () => {
    expect(old.slice(0, 100)).toEqual(bank.slice(0, 100));
    const h = createHash("sha256").update(JSON.stringify(bank.slice(0, 100))).digest("hex");
    expect(h).toBe(createHash("sha256").update(JSON.stringify(old.slice(0, 100))).digest("hex"));
  });
  it("public 20 contain no imperfect questions", () => {
    expect((pub as QuizQuestion[]).some((q) => quizTense(q) === "imperfect")).toBe(false);
  });
  it("subjunctive tab splits by tense; mix includes all three", () => {
    expect(quizPool(bank, "subjunctive", "easy", "imperfect")).toHaveLength(10);
    expect(quizPool(bank, "subjunctive", "easy", "present")).toHaveLength(15);
    const mix = quizPool(bank, "mix", "easy");
    expect(new Set(mix.map((q) => quizTense(q) ?? "verbs"))).toEqual(new Set(["verbs", "present", "imperfect"]));
    expect(new Set(ids(mix)).size).toBe(mix.length);
  });
  it("trial unlocks Easy imperfect only", () => {
    expect(quizLevelLocked("subjunctive", "easy", "trial")).toBe(false);
    expect(quizLevelLocked("subjunctive", "hard", "trial")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import full from "@/data/quiz.json";
import pub from "@/data/quiz.public.json";
import { FREE_QUIZ_IDS_AFTER_TRIAL, quizLevelLocked } from "./content-access";
import { buildPublicQuiz, type QuizQuestion } from "./quiz-public-build";
import { resolveQuiz, type QuizDeps } from "./quiz.server";
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
    expect(h).toBe("2539ae181ad81f02a1b991167c0d8708e4eccacd52a03acbac8616b6f91211f4");
  });
  it("has 100 unique ids q001–q100, valid fields, one correct option each", () => {
    expect(ids(bank)).toEqual(Array.from({ length: 100 }, (_, i) => `q${String(i + 1).padStart(3, "0")}`));
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
    expect(restricted).toHaveLength(80);
    for (const q of restricted) expect(text.includes(q.question)).toBe(false);
  });
});

describe("access tiers (real server decision path)", () => {
  it("purchase pass: all 100", async () => {
    const r = await resolveQuiz({ pass: "p" }, deps({ passRole: async () => "purchase" }));
    expect(r.tier).toBe("full");
    expect(r.questions).toHaveLength(100);
  });
  it("creator pass: all 100", async () => {
    const r = await resolveQuiz({ pass: "p" }, deps({ passRole: async () => "creator" }));
    expect(r.questions).toHaveLength(100);
  });
  it("active trial: 50 verbs + 15 Easy subjunctive", async () => {
    const r = await resolveQuiz({}, deps({ trialStart: async () => new Date(NOW - 3 * DAY).toISOString() }));
    expect(r.tier).toBe("trial");
    expect(r.questions.filter((q) => q.category === "verbs")).toHaveLength(50);
    const subj = r.questions.filter((q) => q.category === "subjunctive");
    expect(subj).toHaveLength(15);
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
    const r = newRound(quizPool(bank, "subjunctive", "hard"));
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

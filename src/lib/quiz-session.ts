/** Pure quiz-round helpers. No React, no storage. */
import { shuffle } from "./random-sequence";
import type { QuizQuestion } from "./quiz-public-build";
import { quizTense } from "./quiz-tense";
import type { Tense } from "@/data/subjunctive-tense";

export type QuizCategory = "verbs" | "subjunctive" | "mix";
export type QuizDifficulty = "easy" | "medium" | "hard";

/** Only from the questions the server authorised — never adds others. */
export function quizPool(
  authorised: readonly QuizQuestion[],
  category: QuizCategory,
  difficulty: QuizDifficulty,
  /** Subjunctive tab only: which tense. Mix always includes both. */
  tense?: Tense,
): QuizQuestion[] {
  const seen = new Set<string>();
  return authorised.filter((q) => {
    if (seen.has(q.id)) return false; // never the same question twice
    seen.add(q.id);
    if (q.difficulty !== difficulty) return false;
    if (category === "mix") return true;
    if (q.category !== category) return false;
    return category !== "subjunctive" || !tense || quizTense(q) === tense;
  });
}

export interface Round {
  order: string[];
  index: number;
  score: number;
  answered: number | null;
}

/** A fresh round: every pool question once, shuffled, no repeats. */
export function newRound(pool: readonly QuizQuestion[], rand?: () => number): Round {
  return { order: shuffle(pool.map((q) => q.id), rand), index: 0, score: 0, answered: null };
}

export function answer(round: Round, optionIndex: number, correct: boolean): Round {
  if (round.answered !== null) return round; // no second submission
  return { ...round, answered: optionIndex, score: round.score + (correct ? 1 : 0) };
}

export function next(round: Round): Round {
  if (round.answered === null) return round;
  return { ...round, index: round.index + 1, answered: null };
}

export const isFinished = (r: Round) => r.index >= r.order.length;

const BEST_KEY = "vw_quiz_best_v1";
/** Quiz-only device storage, separate from flashcards and trial. */
export function saveBest(mode: string, score: number, total: number) {
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}") as Record<string, { score: number; total: number }>;
    const prev = all[mode];
    if (!prev || score / total > prev.score / prev.total) all[mode] = { score, total };
    localStorage.setItem(BEST_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable */
  }
}
export const QUIZ_STORAGE_KEY = BEST_KEY;

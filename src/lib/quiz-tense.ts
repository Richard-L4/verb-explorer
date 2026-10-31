/**
 * The single place that says which subjunctive quiz questions are imperfect.
 * The bank marks them only as "subjunctive"; q101–q150 were approved as the
 * Imperfect Subjunctive set. Every other subjunctive question is present.
 */
import type { Tense } from "@/data/subjunctive-tense";

export const IMPERFECT_QUIZ_IDS: readonly string[] = Array.from(
  { length: 50 },
  (_, i) => `q${String(101 + i).padStart(3, "0")}`,
);

const imperfectSet = new Set(IMPERFECT_QUIZ_IDS);

/** Tense of a subjunctive question; null for verb questions. */
export function quizTense(q: { id: string; category: string }): Tense | null {
  if (q.category !== "subjunctive") return null;
  return imperfectSet.has(q.id) ? "imperfect" : "present";
}

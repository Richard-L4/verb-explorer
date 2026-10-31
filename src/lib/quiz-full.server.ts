/**
 * Server-only full quiz bank, dynamically loaded through quiz.server.ts.
 * Reads bundled JSON; use-quiz calls quiz.functions.ts and receives only server-filtered questions.
 */
/** Server-only: the complete quiz bank. Never import from client code. */
import raw from "@/data/quiz.json";
import type { QuizQuestion } from "./quiz-public-build";

export const fullQuiz = raw as QuizQuestion[];

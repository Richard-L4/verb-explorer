/** Server-only: the complete quiz bank. Never import from client code. */
import raw from "@/data/quiz.json";
import type { QuizQuestion } from "./quiz-public-build";

export const fullQuiz = raw as QuizQuestion[];

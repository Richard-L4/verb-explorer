import { FREE_QUIZ_IDS_AFTER_TRIAL } from "./content-access";
/** Pure: picks the free public quiz pool. Shared by the generator and tests. */
export interface QuizOption { text: string; correct: boolean; feedback: string }
export interface QuizQuestion {
  id: string;
  category: "verbs" | "subjunctive";
  difficulty: "easy" | "medium" | "hard";
  sourceId: string;
  question: string;
  options: QuizOption[];
}

/** The free SER vs ESTAR questions (ids fixed in content-access.ts), in file order. */
export function buildPublicQuiz(all: QuizQuestion[]): QuizQuestion[] {
  const free = new Set<string>(FREE_QUIZ_IDS_AFTER_TRIAL);
  const pool = all.filter((q) => free.has(q.id));
  if (pool.length !== free.size) throw new Error(`Public quiz pool must contain ${free.size} questions; got ${pool.length}`);
  return pool;
}

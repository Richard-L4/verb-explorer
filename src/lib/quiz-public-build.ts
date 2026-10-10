/** Pure: picks the fixed public quiz pool. Shared by the generator and tests. */
export interface QuizOption { text: string; correct: boolean; feedback: string }
export interface QuizQuestion {
  id: string;
  category: "verbs" | "subjunctive";
  difficulty: "easy" | "medium" | "hard";
  sourceId: string;
  question: string;
  options: QuizOption[];
}

/** First 20 Easy questions in file order (filter Easy first, then take 20). */
export function buildPublicQuiz(all: QuizQuestion[]): QuizQuestion[] {
  const pool = all.filter((q) => q.difficulty === "easy").slice(0, 20);
  const verbs = pool.filter((q) => q.category === "verbs").length;
  const subj = pool.filter((q) => q.category === "subjunctive").length;
  if (pool.length !== 20 || verbs !== 15 || subj !== 5) {
    throw new Error(`Public quiz pool must be 15 verbs + 5 subjunctive Easy; got ${verbs} + ${subj}`);
  }
  return pool;
}

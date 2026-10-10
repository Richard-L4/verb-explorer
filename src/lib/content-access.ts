/**
 * Single content-access policy for verbs and subjunctive.
 * Pure functions only — shared by the browser, the server and the build script.
 *
 * - Standard verb cards: always free.
 * - Subjunctive: the 20 ids below have free Easy content. Everything else
 *   (other 80 entries, and Medium/Hard everywhere) needs a server-confirmed
 *   purchase. The trial does not unlock subjunctive content.
 * - Sayings keep the original trial/free-card rule (see use-access.ts).
 */
import type { SubjunctiveEntry, SubjunctiveExample } from "@/data/subjunctive";

/** Fixed list — do not change without approval. First 20 in deck order. */
export const FREE_SUBJUNCTIVE_IDS = [
  "ser-vs-estar",
  "fue-vs-era",
  "por-vs-para",
  "saber-vs-conocer",
  "salir-vs-quedar",
  "llevar-vs-hacer",
  "pedir-vs-preguntar",
  "poder-vs-saber",
  "deber-vs-tener-que",
  "ir-vs-venir",
  "traer-vs-llevar",
  "querer-vs-amar",
  "mirar-vs-ver",
  "escuchar-vs-oir",
  "acordarse-vs-recordar",
  "sentir-vs-sentirse",
  "pensar-vs-creer",
  "gastar-vs-pasar",
  "hablar-vs-decir",
  "encontrar-vs-buscar",
] as const;

const freeSet = new Set<string>(FREE_SUBJUNCTIVE_IDS);

export type Difficulty = SubjunctiveExample["difficulty"];

export function verbCardLocked(_id: string): boolean {
  return false;
}

export function isFreeSubjunctive(id: string): boolean {
  return freeSet.has(id);
}

/** `paid` must come from a server-verified purchase pass, never a local flag. */
export function canViewSubjunctive(id: string, difficulty: Difficulty, paid: boolean): boolean {
  if (paid) return true;
  return difficulty === "easy" && freeSet.has(id);
}

export function subjunctiveEntryOpen(id: string, paid: boolean): boolean {
  return canViewSubjunctive(id, "easy", paid);
}

/** Public-safe view of an entry: title for everyone, permitted examples only. */
export interface PublicSubjunctiveEntry {
  id: string;
  title: string;
  triggers?: SubjunctiveEntry["triggers"];
}

export function filterEntryForAccess(
  entry: SubjunctiveEntry,
  paid: boolean,
): PublicSubjunctiveEntry {
  if (!subjunctiveEntryOpen(entry.id, paid)) return { id: entry.id, title: entry.title };
  return {
    id: entry.id,
    title: entry.title,
    triggers: entry.triggers.map((t) => ({
      ...t,
      examples: t.examples.filter((x) => canViewSubjunctive(entry.id, x.difficulty, paid)),
    })),
  };
}

/** Ids eligible for Random Subjunctive. Unpaid pools never contain locked entries. */
export function randomSubjunctivePool(allIds: readonly string[], paid: boolean): string[] {
  return paid ? [...allIds] : allIds.filter((id) => freeSet.has(id));
}

/* ---------------------------------------------------------------- Quiz --- */

/**
 * Quiz tiers. Decided by the server only (signed pass / server trial record).
 * - full:   purchase or creator — all 100 questions.
 * - trial:  active 7-day trial — all Verb questions + Easy Subjunctive.
 * - public: everyone else — the fixed 20 below.
 */
export type QuizTier = "full" | "trial" | "public";

/** Fixed: first 20 Easy questions in quiz.json order (15 verbs, 5 subjunctive). */
export const FREE_QUIZ_IDS_AFTER_TRIAL = [
  "q001", "q002", "q004", "q007", "q014", "q018", "q022", "q025", "q029", "q031",
  "q033", "q036", "q041", "q043", "q050", "q051", "q056", "q059", "q062", "q065",
] as const;

const freeQuizSet = new Set<string>(FREE_QUIZ_IDS_AFTER_TRIAL);

export function quizTier(input: { role: "purchase" | "creator" | "preview" | null; trialActive: boolean }): QuizTier {
  if (input.role) return "full";
  return input.trialActive ? "trial" : "public";
}

export function quizQuestionAllowed(
  q: { id: string; category: string; difficulty: string },
  tier: QuizTier,
): boolean {
  if (tier === "full") return true;
  if (tier === "trial") return q.category === "verbs" || q.difficulty === "easy";
  return freeQuizSet.has(q.id);
}

/** Whether a tab/level choice is locked for this tier (for showing the unlock prompt). */
export function quizLevelLocked(category: "verbs" | "subjunctive" | "mix", difficulty: string, tier: QuizTier): boolean {
  if (tier === "full") return false;
  if (tier === "trial") return category === "subjunctive" && difficulty !== "easy";
  return difficulty !== "easy";
}

/**
 * Single content-access policy for verbs and subjunctive.
 * Pure functions only — shared by the browser, the server and the build script.
 *
 * - Active server-verified trial, purchase or creator: everything.
 * - Otherwise: only the SER vs ESTAR collection (verb card, all subjunctive
 *   levels in both tenses, its quiz questions). Sayings are all locked.
 */
import type { SubjunctiveEntry, SubjunctiveExample } from "@/data/subjunctive";

/**
 * The permanent free collection after the trial: SER vs ESTAR only.
 * Same id in the verb deck, present and imperfect subjunctive.
 */
export const FREE_COLLECTION_ID = "ser-vs-estar";
export const FREE_SUBJUNCTIVE_IDS = [FREE_COLLECTION_ID] as const;

const freeSet = new Set<string>(FREE_SUBJUNCTIVE_IDS);

export type Difficulty = SubjunctiveExample["difficulty"];

export function isFreeCollection(id: string): boolean {
  return id === FREE_COLLECTION_ID;
}

/** `full` = server-confirmed purchase/creator pass or active server-verified trial. */
export function verbCardLocked(id: string, full: boolean): boolean {
  return !full && !isFreeCollection(id);
}

/** Sayings: no permanent free sayings; trial or purchase only. */
export function sayingLocked(_id: string, full: boolean): boolean {
  return !full;
}

export function isFreeSubjunctive(id: string): boolean {
  return freeSet.has(id);
}

/** `paid` must come from a server-verified purchase pass, never a local flag. */
export function canViewSubjunctive(id: string, difficulty: Difficulty, paid: boolean): boolean {
  void difficulty;
  return paid || freeSet.has(id);
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
 * - full:   purchase or creator — every question.
 * - trial:  active 7-day trial — every question.
 * - public: everyone else — the SER vs ESTAR questions below.
 */
export type QuizTier = "full" | "trial" | "public";

/**
 * Free after the trial: questions that genuinely test ser vs estar (reviewed by hand,
 * not by sourceId alone). Questions that only mention ser/estar stay paid.
 */
export const FREE_QUIZ_IDS_AFTER_TRIAL = ["q001", "q101"] as const;

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
  if (tier === "trial") return true;
  return freeQuizSet.has(q.id);
}

/** Whether a tab/level choice is locked for this tier (for showing the unlock prompt). */
export function quizLevelLocked(category: "verbs" | "subjunctive" | "mix", difficulty: string, tier: QuizTier): boolean {
  if (tier === "full") return false;
  if (tier === "trial") return false;
  void category;
  return difficulty !== "easy";
}

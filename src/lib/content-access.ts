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

export function filterEntryForAccess(entry: SubjunctiveEntry, paid: boolean): PublicSubjunctiveEntry {
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

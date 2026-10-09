import type { SubjunctiveEntry } from "@/data/subjunctive";
import { filterEntryForAccess, type PublicSubjunctiveEntry } from "./content-access";

/** Derives the browser-safe dataset from the full one. */
export function buildPublicSubjunctive(full: SubjunctiveEntry[]): PublicSubjunctiveEntry[] {
  return full.map((e) => filterEntryForAccess(e, false));
}

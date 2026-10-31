/**
 * Shared pure builder used by generation scripts and tests.
 * Depends on the central access policy and content types, not protected JSON.
 * Passing false applies unpaid access before data becomes a browser asset.
 */
import type { SubjunctiveEntry } from "@/data/subjunctive";
import { filterEntryForAccess, type PublicSubjunctiveEntry } from "./content-access";

/** Derives the browser-safe dataset from the full one. */
export function buildPublicSubjunctive(full: SubjunctiveEntry[]): PublicSubjunctiveEntry[] {
  return full.map((e) => filterEntryForAccess(e, false));
}

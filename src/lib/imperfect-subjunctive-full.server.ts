/**
 * Server-only complete imperfect dataset, dynamically loaded by subjunctive-content.functions.ts.
 * Reads bundled JSON, not a database; use-subjunctive receives it only after entitlement checks.
 */
/** Server-only: the complete imperfect subjunctive dataset. Never import from client code. */
import raw from "@/data/imperfect-subjunctive.json";
import type { SubjunctiveEntry } from "@/data/subjunctive";

export const fullImperfectSubjunctive = raw as SubjunctiveEntry[];

/**
 * Server-only complete present subjunctive dataset for subjunctive-content.functions.ts.
 * Reads bundled JSON; use-subjunctive gets protected entries only after server entitlement checks.
 */
/** Server-only: the complete subjunctive dataset. Never import from client code. */
import raw from "@/data/subjunctive.json";
import type { SubjunctiveEntry } from "@/data/subjunctive";

export const fullSubjunctive = raw as SubjunctiveEntry[];

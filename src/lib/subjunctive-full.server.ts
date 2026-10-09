/** Server-only: the complete subjunctive dataset. Never import from client code. */
import raw from "@/data/subjunctive.json";
import type { SubjunctiveEntry } from "@/data/subjunctive";

export const fullSubjunctive = raw as SubjunctiveEntry[];

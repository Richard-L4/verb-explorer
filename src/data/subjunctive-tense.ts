/** The two subjunctive tenses taught in Verb Wise. */
export type Tense = "present" | "imperfect";
export const TENSES: readonly Tense[] = ["present", "imperfect"];
export const tenseLabel: Record<Tense, string> = { present: "Present", imperfect: "Imperfect" };
export const isTense = (v: unknown): v is Tense => v === "present" || v === "imperfect";

/**
 * Subjunctive types and completeness rule. Pure — never imports the full
 * dataset, which is server-only (see subjunctive-full.server.ts).
 */
import { getCard } from "./cards";

export interface SubjunctiveContrast {
  es: string;
  en: string;
  note: string;
}
export interface SubjunctiveExample {
  difficulty: "easy" | "medium" | "hard";
  level: string;
  es: string;
  en: string;
  form: string;
  note: string;
  contrast?: SubjunctiveContrast;
}
export interface SubjunctiveTrigger {
  category: string;
  trigger: string;
  explanation: string;
  examples: SubjunctiveExample[];
}
export interface SubjunctiveEntry {
  id: string;
  title: string;
  triggers: SubjunctiveTrigger[];
}

export const TRIGGERS_PER_ENTRY = 3;
export const EXAMPLES_PER_TRIGGER = 3;
const DIFFICULTIES = ["easy", "medium", "hard"];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Shape used only while validating unknown JSON. */
type Loose = { [k: string]: unknown } & Partial<
  Record<"id" | "title" | "triggers" | "examples" | "difficulty" | "level" | "contrast", unknown>
>;

const isText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isObj = (v: unknown): v is Loose => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Lists every problem with one entry. Empty list = complete and usable.
 * `knownId` decides whether the id matches a real verb card.
 */
export function entryProblems(
  entry: unknown,
  knownId: (id: string) => boolean = (id) => !!getCard(id),
): string[] {
  const p: string[] = [];
  if (!isObj(entry)) return ["entry is not an object"];
  const id = isText(entry.id) ? entry.id : "(missing id)";
  if (!isText(entry.id)) p.push(`${id}: missing id`);
  else if (!knownId(entry.id)) p.push(`${id}: id does not match any verb card`);
  if (!isText(entry.title)) p.push(`${id}: missing title`);
  if (!Array.isArray(entry.triggers)) {
    p.push(`${id}: triggers missing or not an array`);
    return p;
  }
  if (entry.triggers.length !== TRIGGERS_PER_ENTRY)
    p.push(`${id}: has ${entry.triggers.length} triggers, expected ${TRIGGERS_PER_ENTRY}`);
  entry.triggers.forEach((t, ti) => {
    const tl = `${id} trigger ${ti + 1}`;
    if (!isObj(t)) return void p.push(`${tl}: not an object`);
    for (const k of ["category", "trigger", "explanation"])
      if (!isText(t[k])) p.push(`${tl}: missing ${k}`);
    if (!Array.isArray(t.examples)) return void p.push(`${tl}: examples missing or not an array`);
    if (t.examples.length !== EXAMPLES_PER_TRIGGER)
      p.push(`${tl}: has ${t.examples.length} examples, expected ${EXAMPLES_PER_TRIGGER}`);
    t.examples.forEach((ex, ei) => {
      const el = `${tl} example ${ei + 1}`;
      if (!isObj(ex)) return void p.push(`${el}: not an object`);
      for (const k of ["es", "en", "form", "note"])
        if (!isText(ex[k])) p.push(`${el}: missing ${k}`);
      if (!DIFFICULTIES.includes(ex.difficulty as string))
        p.push(`${el}: invalid difficulty "${String(ex.difficulty)}"`);
      if (!LEVELS.includes(ex.level as string))
        p.push(`${el}: invalid level "${String(ex.level)}"`);
      if (ex.contrast !== undefined) {
        if (!isObj(ex.contrast)) p.push(`${el}: contrast is not an object`);
        else
          for (const k of ["es", "en", "note"])
            if (!isText(ex.contrast[k])) p.push(`${el}: contrast missing ${k}`);
      }
    });
  });
  return p;
}

export function isCompleteEntry(entry: unknown, knownId?: (id: string) => boolean): boolean {
  return entryProblems(entry, knownId).length === 0;
}


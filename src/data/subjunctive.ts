import rawEntries from "./subjunctive.json";
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
type Loose = { [k: string]: unknown } & Partial<Record<"id" | "title" | "triggers" | "examples" | "difficulty" | "level" | "contrast", unknown>>;

const isText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isObj = (v: unknown): v is Loose => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Lists every problem with one entry. Empty list = complete and usable.
 * `knownId` decides whether the id matches a real verb card.
 */
export function entryProblems(entry: unknown, knownId: (id: string) => boolean = (id) => !!getCard(id)): string[] {
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
    for (const k of ["category", "trigger", "explanation"]) if (!isText(t[k])) p.push(`${tl}: missing ${k}`);
    if (!Array.isArray(t.examples)) return void p.push(`${tl}: examples missing or not an array`);
    if (t.examples.length !== EXAMPLES_PER_TRIGGER)
      p.push(`${tl}: has ${t.examples.length} examples, expected ${EXAMPLES_PER_TRIGGER}`);
    t.examples.forEach((ex, ei) => {
      const el = `${tl} example ${ei + 1}`;
      if (!isObj(ex)) return void p.push(`${el}: not an object`);
      for (const k of ["es", "en", "form", "note"]) if (!isText(ex[k])) p.push(`${el}: missing ${k}`);
      if (!DIFFICULTIES.includes(ex.difficulty as string)) p.push(`${el}: invalid difficulty "${String(ex.difficulty)}"`);
      if (!LEVELS.includes(ex.level as string)) p.push(`${el}: invalid level "${String(ex.level)}"`);
      if (ex.contrast !== undefined) {
        if (!isObj(ex.contrast)) p.push(`${el}: contrast is not an object`);
        else for (const k of ["es", "en", "note"]) if (!isText(ex.contrast[k])) p.push(`${el}: contrast missing ${k}`);
      }
    });
  });
  return p;
}

export function isCompleteEntry(entry: unknown, knownId?: (id: string) => boolean): boolean {
  return entryProblems(entry, knownId).length === 0;
}

/** Single source of truth: subjunctive.json, used unchanged. */
export const subjunctiveEntries: SubjunctiveEntry[] = rawEntries as SubjunctiveEntry[];

const byId = new Map(subjunctiveEntries.map((e) => [e.id, e]));
const completeIds = new Set(subjunctiveEntries.filter((e) => isCompleteEntry(e)).map((e) => e.id));

export const completeEntries = subjunctiveEntries.filter((e) => completeIds.has(e.id));
export const completeEntryCount = completeEntries.length;

export function getEntry(id: string): SubjunctiveEntry | undefined {
  return byId.get(id);
}
export function isEntryComplete(id: string): boolean {
  return completeIds.has(id);
}

/** Previous/next among complete entries, wrapping round. */
export function getEntryNeighbours(id: string) {
  const i = completeEntries.findIndex((e) => e.id === id);
  const n = completeEntries.length;
  if (i < 0 || n < 2) return { position: i + 1, total: n };
  return { prev: completeEntries[(i - 1 + n) % n], next: completeEntries[(i + 1) % n], position: i + 1, total: n };
}

const norm = (v: string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const index = subjunctiveEntries.map((e) => ({
  e,
  hay: norm(
    [e.title, ...(e.triggers ?? []).flatMap((t) => [t.trigger, t.category, ...(t.examples ?? []).flatMap((x) => [x.es, x.en, x.form])])].join(" \u0000 "),
  ),
}));
export function searchEntries(query: string): SubjunctiveEntry[] {
  const q = norm(query.trim());
  if (!q) return subjunctiveEntries;
  const terms = q.split(/\s+/);
  return index.filter(({ hay }) => terms.every((t) => hay.includes(t))).map(({ e }) => e);
}

if (import.meta.env.DEV && import.meta.env.MODE !== "test") {
  const problems: string[] = [];
  const seen = new Map<string, number>();
  (rawEntries as unknown[]).forEach((e) => {
    problems.push(...entryProblems(e));
    const id = isObj(e) && isText(e.id) ? e.id : null;
    if (id) seen.set(id, (seen.get(id) ?? 0) + 1);
  });
  for (const [id, n] of seen) if (n > 1) problems.push(`${id}: duplicate id (${n} entries)`);
  if (problems.length) console.warn(`[subjunctive] ${problems.length} data issue(s):\n` + problems.join("\n"));
}

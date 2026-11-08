/**
 * Form index and fuzzy matching for "Ask me a question".
 * Builds a map from Spanish word forms to card infinitives using, in priority order:
 * lesson `form` labels the user can already see, then regular forms generated from
 * card infinitives (never for irregular verbs, whose regular forms become learner errors).
 * Fuzzy matching is supporting evidence only: the engine shows it as NEAREST, never MATCH.
 */
import type { PublicSubjunctiveEntry } from "@/lib/content-access";
import { stripAccents } from "./normalise";

/** One adjustable place for the match thresholds described in the plan. */
export const THRESHOLDS = { minFuzzyLength: 5, longWord: 8 } as const;

/** Verbs whose regular conjugation is wrong; only explicit/lesson forms count for them. */
export const IRREGULAR = new Set([
  "ser", "ir", "estar", "haber", "tener", "hacer", "poder", "poner", "decir", "venir", "saber", "querer",
  "conocer", "pedir", "perder", "dar", "ver", "caber", "caer", "traer", "valer", "salir", "oir", "conducir",
  "introducir", "seguir", "conseguir", "sentir", "dormir", "morir", "despedir", "vestir", "oler", "andar",
]);

/** Stem-changing verbs: present singular/3rd-plural forms change the stem, so they are skipped. */
const STEM_CHANGE = new Set([
  "acordar", "acostar", "cerrar", "costar", "encontrar", "entender", "jugar", "mover", "pensar", "probar",
  "recordar", "sentar", "sonar", "volver", "aprobar", "avergonzar", "despertar", "soler", "atender", "pretender",
]);

/** Known correct forms for common learner over-regularisations. */
const CORRECTIONS: Record<string, string> = {
  sabo: "sé", ponido: "puesto", hacido: "hecho", decido: "dicho", escribido: "escrito", volvido: "vuelto",
  morido: "muerto", vido: "visto", abrido: "abierto", tenio: "tuvo", cabo: "quepo",
  hazo: "hago", pono: "pongo", teno: "tengo", veno: "vengo", salo: "salgo", trao: "traigo", conoco: "conozco",
};

/** Words that are verb forms and also ordinary nouns/particles; need context before a MATCH. */
export const HOMOGRAPHS: Record<string, { verb: string; other: string }> = {
  vino: { verb: "venir", other: "the noun “vino” (wine)" },
  sobre: { verb: "sobrar", other: "the preposition “sobre” (on / about)" },
  haya: { verb: "haber", other: "the noun “haya” (beech tree)" },
  banco: { verb: "", other: "the noun “banco” (bank / bench)" },
};

/** Words that make a following homograph clearly verbal (subject, que, object pronouns, no). */
export const VERB_CONTEXT = new Set(["yo", "tu", "el", "ella", "usted", "nosotros", "ellos", "ellas", "ustedes", "que", "no", "me", "te", "se", "le", "lo", "la", "nos", "les", "ya", "ayer", "nunca"]);

const STOPWORDS = new Set(["como", "para", "sobre", "entre", "desde", "hasta", "donde", "cuando", "porque", "pero", "todo", "todos", "mucho", "mucha", "otra", "otro", "este", "esta", "casa", "cosa", "nada", "algo", "solo", "bien", "antes", "luego", "ahora", "siempre", "tambien", "mismo", "nadie", "hola", "gracias"]);

const ENDS: Record<"ar" | "er" | "ir", { present: string[]; stemSafe: string[]; other: string[] }> = {
  ar: { present: ["o", "as", "a", "an"], stemSafe: ["amos", "ais"], other: ["e", "aste", "aron", "aba", "abas", "abamos", "aban", "ando", "ado", "ada"] },
  er: { present: ["o", "es", "e", "en"], stemSafe: ["emos", "eis"], other: ["i", "iste", "io", "ieron", "ia", "ias", "iamos", "ian", "iendo", "ido", "ida"] },
  ir: { present: ["o", "es", "e", "en"], stemSafe: ["imos", "is"], other: ["i", "iste", "io", "ieron", "ia", "ias", "iamos", "ian", "iendo", "ido", "ida"] },
};

export type FormSource = "lesson" | "regular";
export interface FormIndex {
  forms: Map<string, { verbs: Set<string>; source: FormSource }>;
  wrong: Map<string, { verb: string; correct?: string }>;
}

const cache = new WeakMap<object, FormIndex>();

/**
 * Builds the index for one dataset. `headwords` are accent-free card infinitives;
 * `lessons` are only the entries this user may see, so locked forms never enter it.
 */
export function buildFormIndex(headwords: Set<string>, lessons: PublicSubjunctiveEntry[][], key: object): FormIndex {
  const hit = cache.get(key);
  if (hit) return hit;
  const forms: FormIndex["forms"] = new Map();
  const wrong: FormIndex["wrong"] = new Map();
  const add = (f: string, verb: string, source: FormSource) => {
    if (f.length < 5 || STOPWORDS.has(f) || headwords.has(f)) return;
    const cur = forms.get(f);
    if (cur && cur.source === "lesson" && source === "regular") return;
    if (cur && cur.source === source) cur.verbs.add(verb);
    else forms.set(f, { verbs: new Set([verb]), source });
  };
  for (const list of lessons)
    for (const e of list)
      for (const t of e.triggers ?? [])
        for (const x of t.examples ?? []) {
          const m = /^\s*([^()]+?)\s*\(([^)]+)\)/.exec(x.form ?? "");
          if (!m) continue;
          const verb = stripAccents(m[2]!.toLowerCase().trim()).replace(/se$/, "");
          if (!headwords.has(verb)) continue;
          for (const w of stripAccents(m[1]!.toLowerCase()).split(/[\s/,]+/)) if (/^[a-zn]+$/.test(w) && w !== "que") add(w, verb, "lesson");
        }
  for (const hw of headwords) {
    const base = hw.endsWith("se") && hw.length > 4 ? hw.slice(0, -2) : hw;
    const end = base.slice(-2) as "ar" | "er" | "ir";
    if (!(end in ENDS)) continue;
    const stem = base.slice(0, -2);
    if (stem.length < 2) continue;
    if (IRREGULAR.has(base)) {
      for (const e of ["o", end === "ar" ? "ado" : "ido"]) {
        const f = stem + e;
        if (!forms.has(f) && !headwords.has(f)) wrong.set(f, { verb: base, correct: CORRECTIONS[f] });
      }
      continue;
    }
    const set = ENDS[end];
    const endings = [...set.stemSafe, ...set.other, ...(STEM_CHANGE.has(base) ? [] : set.present)];
    for (const e of endings) add(stem + e, hw === base ? base : hw, "regular");
  }
  for (const [f, c] of Object.entries(CORRECTIONS)) if (!wrong.has(f) && !forms.has(f) && f !== c) wrong.set(f, { verb: "", correct: c });
  const idx = { forms, wrong };
  cache.set(key, idx);
  return idx;
}

/** Damerau-Levenshtein (optimal string alignment) distance, bounded for speed. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length]![b.length]!;
}

/** Spelling normalisations learners commonly confuse (k/qu, s/z/c, b/v, silent h). */
const phon = (w: string) => w.replace(/k/g, "qu").replace(/[zs]/g, "c").replace(/v/g, "b").replace(/^h/, "");

/**
 * Fuzzy lookup: returns the single verb whose nearest form is strictly closer than any
 * other verb's, or null. Words under 5 letters never match; 5–7 allow 1 edit, 8+ allow 2.
 */
export function fuzzyVerb(word: string, candidates: Iterable<[string, string]>): { verb: string; form: string } | null {
  if (word.length < THRESHOLDS.minFuzzyLength || STOPWORDS.has(word)) return null;
  const max = word.length >= THRESHOLDS.longWord ? 2 : 1;
  const pw = phon(word);
  const best = new Map<string, { d: number; form: string }>();
  for (const [form, verb] of candidates) {
    const d = Math.min(editDistance(word, form, max), editDistance(pw, phon(form), max));
    if (d > max || d === 0) continue;
    const cur = best.get(verb);
    if (!cur || d < cur.d) best.set(verb, { d, form });
  }
  const ranked = [...best].sort((a, b) => a[1].d - b[1].d);
  if (!ranked.length) return null;
  if (ranked.length > 1 && ranked[1]![1].d === ranked[0]![1].d) return null;
  return { verb: ranked[0]![0], form: ranked[0]![1].form };
}

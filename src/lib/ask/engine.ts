/**
 * Local question interpreter for "Ask me a question". No AI service, no network.
 * Two checks must pass before an answer is shown:
 *  A. a grammatical intent is recognised with confidence (else: clarify), and
 *  B. a real Verb Wise card/entry the caller can see supports it (else: fallback).
 * The caller passes only data it is allowed to see, so locked content cannot leak.
 */
import { verbCandidates, EXTRA_NOTES, EXPLICIT_FORMS, DERIVED_NOUNS } from "./verb-forms";
import { buildFormIndex, fuzzyVerb, HOMOGRAPHS, VERB_CONTEXT, parseQuestionFrame, verifiedPrefixCoinage } from "./match";
import { OFF_PACK_WORDS, OFF_PACK_POOL, displayOffPack, type OffPackWord } from "./off-pack";
import type { VerbCard } from "@/data/cards";
import type { PublicSubjunctiveEntry } from "@/lib/content-access";
import { normalise, stripAccents } from "./normalise";

/**
 * Everything the interpreter may search. Callers build this from data the user is
 * already entitled to (public JSON or a pass-unlocked copy), never from locked files.
 */
export interface AskData {
  cards: VerbCard[];
  /** Present subjunctive entries visible to this user (public or full). */
  present: PublicSubjunctiveEntry[];
  imperfect: PublicSubjunctiveEntry[];
}

/** A typed TanStack Router destination, so every answer links to a real lesson page. */
export type LessonLink =
  | { to: "/card/$cardId"; params: { cardId: string }; label: string }
  | { to: "/subjunctive/present/$entryId"; params: { entryId: string }; label: string }
  | { to: "/subjunctive/imperfect/$entryId"; params: { entryId: string }; label: string };

export interface AskCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

export interface AskUnlisted {
  term: string;
  verb: string;
  note: string;
}

/** Extra context that can accompany either a lesson answer or nearest-card options. */
interface ResolutionNotes {
  corrections?: AskCorrection[];
  unlisted?: AskUnlisted[];
  distinction?: string;
}

/**
 * Discriminated union returned by `ask`. The UI switches on `kind`:
 * empty (nothing typed), answer (both checks passed), clarify (several readings),
 * fallback (no supporting entry, so we say so rather than guess).
 */
export type AskResult =
  | { kind: "empty" }
  | {
      kind: "answer";
      area: "verbs" | "present" | "imperfect" | "indicative";
      headline: string;
      es?: string | undefined;
      en?: string | undefined;
      why: string;
      /** Extra explanation written by the engine, not an original Verb Wise example. */
      extra?: string | undefined;
      corrections?: AskCorrection[];
      unlisted?: AskUnlisted[];
      distinction?: string;
      link: LessonLink;
    }
  | { kind: "clarify"; question: string; options: { label: string; query: string }[] }
  | { kind: "fallback"; title: string; message: string; related?: LessonLink }
  /** Probable but not certain: a spelling slip, learner error or ambiguous word. */
  | { kind: "nearest"; title: string; note?: string | undefined; corrections?: AskCorrection[]; unlisted?: AskUnlisted[]; distinction?: string; options: { link: LessonLink; reason: string }[] };

/** Character cap shared by the text box and the engine, bounding regex work per question. */
export const MAX_QUESTION_LENGTH = 1200;

/* ------------------------------------------------------------ intents --- */

type MoodTarget = { tense: "present" | "imperfect"; trigger: string; why: string };

const OBJ = "(?:him|her|you|them|us|it|me|my \\w+|the \\w+|his \\w+|their \\w+|\\w+)";
const SUBJ = "(?:he|she|you|they|we|it|my \\w+|the \\w+|his \\w+|her \\w+|\\w+)";
/** Signals that the thing being doubted/wished about lies in the past. */
const PAST_CLAUSE = /\b(?:was|were|had|did|went|came|said|yesterday|last (?:night|week|year|time)|ago)\b/;

/**
 * Check A: detect which mood/tense the question needs. Spanish trigger phrases are
 * tested first because they are explicit; English is inferred from wording such as
 * "did not think" or a past-tense clause. Order matters: past forms precede present ones.
 * Returns a target, "indicative", "ambiguous-know" (needs clarifying) or null.
 */
function moodIntent(q: string): MoodTarget | "indicative" | "ambiguous-know" | null {
  const es = q;
  // Spanish input first: the trigger phrase is explicit.
  if (/\bno (?:creia|pensaba) que\b/.test(es)) return { tense: "imperfect", trigger: "no creía que", why: "A belief denied in the past is followed by the imperfect subjunctive." };
  if (/\bno (?:creo|pienso) que\b/.test(es)) return { tense: "present", trigger: "no creo que", why: "Denying a belief removes the claim of fact, so the verb after que is subjunctive." };
  if (/\bdudaba que\b/.test(es)) return { tense: "imperfect", trigger: "dudaba que", why: "Doubt in the past takes the imperfect subjunctive." };
  if (/\bdudo que\b/.test(es)) return { tense: "present", trigger: "dudo que", why: "Doubt takes the subjunctive." };
  if (/\bqueria que\b/.test(es)) return { tense: "imperfect", trigger: "quería que", why: "A past wish for someone else takes the imperfect subjunctive." };
  if (/\bquiero que\b/.test(es)) return { tense: "present", trigger: "quiero que", why: "Wanting someone else to do something takes que + subjunctive." };
  if (/\besperaba que\b/.test(es)) return { tense: "imperfect", trigger: "esperaba que", why: "A past hope takes the imperfect subjunctive." };
  if (/\bespero que\b/.test(es)) return { tense: "present", trigger: "espero que", why: "Hoping something happens takes the subjunctive." };
  if (/\bme alegre de que\b/.test(es)) return { tense: "imperfect", trigger: "me alegré de que", why: "A past emotional reaction takes the imperfect subjunctive." };
  if (/\bme alegro (?:de )?que\b/.test(es)) return { tense: "present", trigger: "me alegro de que", why: "An emotional reaction to someone else's action takes the subjunctive." };
  if (/\bojala\b/.test(es)) {
    const imperfect = /\bojala (?:que )?\w+(?:ra|ras|ramos|ran|se|ses|sen)\b/.test(es);
    return imperfect
      ? { tense: "imperfect", trigger: "ojalá", why: "Ojalá + imperfect subjunctive expresses an unlikely or impossible wish." }
      : { tense: "present", trigger: "ojalá", why: "Ojalá + present subjunctive expresses a hope that could come true." };
  }
  if (/\bsi (?:tuviera|fuera|estuviera|pudiera|supiera|hubiera|tuviese|fuese)\b/.test(es)) return { tense: "imperfect", trigger: "si", why: "Si + imperfect subjunctive describes a hypothetical situation." };
  if (/\b(?:creo|pienso) que\b|\bse que\b|\bestoy seguro\b/.test(es) && !/\bno (?:creo|pienso|se|estoy)\b/.test(es)) return "indicative";

  // English.
  const pastClause = PAST_CLAUSE;
  if (/\bdid not (?:think|believe)\b/.test(q)) return { tense: "imperfect", trigger: "no creía que", why: "A belief denied in the past is followed by the imperfect subjunctive." };
  if (/\b(?:do not|never|dont) (?:think|believe)\b|\bnot sure (?:that|if)\b/.test(q)) {
    const rest = q.split(/\b(?:think|believe|sure)\b/).slice(1).join(" ");
    return pastClause.test(rest)
      ? { tense: "imperfect", trigger: "no creía que", why: "When the doubted event is in the past, the verb after que moves to the imperfect subjunctive." }
      : { tense: "present", trigger: "no creo que", why: "Denying a belief removes the claim of fact, so the verb after que is subjunctive." };
  }
  if (/\bdoubted\b/.test(q)) return { tense: "imperfect", trigger: "dudaba que", why: "Doubt in the past takes the imperfect subjunctive." };
  if (/\bdoubt\b/.test(q)) return { tense: "present", trigger: "dudo que", why: "Doubt takes the subjunctive." };
  if (/\bwish\b/.test(q)) return { tense: "imperfect", trigger: "ojalá", why: "A wish about something unreal (I wish I had…) uses ojalá + imperfect subjunctive." };
  if (/\bif (?:i|you|he|she|we|they|it) (?:were|was|had|could|knew)\b.*\bwould\b|\bwould\b.*\bif (?:i|you|he|she|we|they|it) (?:were|had|could|knew)\b/.test(q))
    return { tense: "imperfect", trigger: "si", why: "Si + imperfect subjunctive describes a hypothetical situation." };
  if (new RegExp(`\\bwanted ${OBJ} to\\b`).test(q)) return { tense: "imperfect", trigger: "quería que", why: "A past wish for someone else takes the imperfect subjunctive." };
  if (new RegExp(`\\bwant ${OBJ} to\\b`).test(q) && !/\bwant to\b/.test(q)) return { tense: "present", trigger: "quiero que", why: "Wanting someone else to do something takes que + subjunctive." };
  if (new RegExp(`\\bhoped (?:that )?${SUBJ}\\b`).test(q)) return { tense: "imperfect", trigger: "esperaba que", why: "A past hope takes the imperfect subjunctive." };
  if (new RegExp(`\\bhope (?:that )?${SUBJ}\\b`).test(q) && !/\bhope to\b/.test(q)) return { tense: "present", trigger: "espero que", why: "Hoping something happens takes the subjunctive." };
  if (/\b(?:glad|happy|pleased) (?:that )?(?:he|she|you|they|we|it)\b/.test(q)) return { tense: "present", trigger: "me alegro de que", why: "An emotional reaction to someone else's action takes the subjunctive." };
  if (/\b(?:do not|dont) know (?:if|whether)\b/.test(q)) return "ambiguous-know";
  if (/\bi (?:think|believe|know|am sure|am certain)\b/.test(q)) return "indicative";
  return null;
}

/** English meaning → verb-pair card id (only ids that exist in verbs.json are used). */
const MEANING_HINTS: [RegExp, string][] = [
  [/\bser\b.*\bestar\b|\bestar\b.*\bser\b|\bto be\b/, "ser-vs-estar"],
  [/\bpor\b.*\bpara\b|\bpara\b.*\bpor\b/, "por-vs-para"],
  [/\bfue\b.*\bera\b|\bera\b.*\bfue\b|\bpreterite\b.*\bimperfect\b/, "fue-vs-era"],
  [/\bto know\b/, "saber-vs-conocer"],
  [/\bto ask\b/, "pedir-vs-preguntar"],
  [/\bto bring\b/, "traer-vs-llevar"],
  [/\bto (?:look|see|watch)\b/, "mirar-vs-ver"],
  [/\bto (?:listen|hear)\b/, "escuchar-vs-oir"],
  [/\bto remember\b/, "acordarse-vs-recordar"],
  [/\bto spend\b/, "gastar-vs-pasar"],
  [/\bto (?:say|tell|speak|talk)\b/, "hablar-vs-decir"],
  [/\bto (?:find|look for)\b/, "encontrar-vs-buscar"],
  [/\bto (?:go|come)\b/, "ir-vs-venir"],
  [/\bto love\b/, "querer-vs-amar"],
  [/\b(?:have to|must)\b/, "deber-vs-tener-que"],
];

/** Words ending in -ar/-er/-ir that are not Spanish verbs, so they never trigger "verb not listed". */
const NOT_VERBS = new Set(["mujer", "lugar", "ayer", "hogar", "primer", "tercer", "mar", "bar", "azucar", "cancer", "placer", "deber", "poder", "taller", "collar", "dolar", "altar", "familiar", "popular", "regular", "similar", "par", "ver", "ir", "car", "her", "under", "never", "after", "other", "water", "either", "over", "dinner", "better", "letter", "weather", "rather", "whether", "together", "her", "summer", "mother", "father", "brother", "sister", "number", "matter", "paper", "power", "remember", "answer", "order", "computer", "finger", "chair", "hair", "fair", "pair", "air", "stair", "their", "for", "or", "your", "four", "door", "floor", "poor", "hour", "our", "sir", "stir", "fir", "superior", "interior", "exterior", "anterior", "posterior", "dear", "near", "year", "clear", "hear", "fear", "bear", "wear", "tear", "gear", "rear", "year", "star", "far", "jar", "war", "car", "scar", "radar", "cigar", "solar", "polar", "dollar", "cellar", "pillar", "collar", "sugar", "vinegar", "grammar", "calendar", "cedar", "nectar", "liar", "peculiar", "particular", "spectacular", "molecular", "circular", "muscular", "vehicular"]);

/* -------------------------------------------------------------- index --- */

/** Short connector words ignored when indexing card headwords. */
const STOP = new Set(["que", "de", "con", "se", "la", "el", "a", "en"]);

interface Index {
  deckWords: Set<string>;
  cardsByWord: Map<string, Set<string>>;
}

/** Cached per cards array (WeakMap), so the index is built once and freed with the data. */
const indexCache = new WeakMap<VerbCard[], Index>();

/** Maps each accent-free Spanish headword on the cards to the card ids that contain it. */
function buildIndex(cards: VerbCard[]): Index {
  const cached = indexCache.get(cards);
  if (cached) return cached;
  const deckWords = new Set<string>();
  const cardsByWord = new Map<string, Set<string>>();
  for (const c of cards) {
    const words = new Set<string>();
    for (const s of c.sides ?? []) {
      const base = stripAccents(s.word.toLowerCase()).replace(/\(.*?\)/g, " ");
      for (const w of base.split(/[\s/]+/)) if (w.length >= 2 && !STOP.has(w) && /^[a-zñ]+$/.test(w)) words.add(w);
    }
    for (const w of words) {
      deckWords.add(w);
      if (!cardsByWord.has(w)) cardsByWord.set(w, new Set());
      cardsByWord.get(w)!.add(c.id);
    }
  }
  const idx = { deckWords, cardsByWord };
  indexCache.set(cards, idx);
  return idx;
}

/* ------------------------------------------------------------ answers --- */

const tokens = (s: string) => new Set(normalise(s).split(" ").filter((w) => w.length > 2));

/** Counts shared words; a simple relevance score for picking the closest example. */
function overlap(a: Set<string>, text: string): number {
  let n = 0;
  for (const w of tokens(text)) if (a.has(w)) n++;
  return n;
}

/**
 * Check B for mood questions: find a real entry whose trigger matches, preferring the
 * example that shares most words with the question (easy examples get a small bonus).
 * Returns null when the user cannot see any supporting entry.
 */
function findMoodSupport(target: MoodTarget, data: AskData, qTokens: Set<string>) {
  const list = target.tense === "present" ? data.present : data.imperfect;
  const want = stripAccents(target.trigger);
  let best: { entry: PublicSubjunctiveEntry; es: string; en: string; form?: string; explanation: string; score: number } | null = null;
  for (const entry of list) {
    for (const t of entry.triggers ?? []) {
      if (stripAccents(t.trigger) !== want) continue;
      for (const x of t.examples) {
        const score = overlap(qTokens, `${x.en} ${x.es} ${entry.title}`) + (x.difficulty === "easy" ? 0.5 : 0);
        if (!best || score > best.score) best = { entry, es: x.es, en: x.en, form: x.form, explanation: t.explanation, score };
      }
    }
  }
  return best;
}

function cardLink(card: VerbCard): LessonLink {
  return { to: "/card/$cardId", params: { cardId: card.id }, label: `Open “${card.title}”` };
}

/** Builds a verb-pair answer from one card, choosing its example closest to the question. */
function cardAnswer(card: VerbCard, qTokens: Set<string>): AskResult {
  let es: string | undefined;
  let en: string | undefined;
  let bestScore = -1;
  for (const s of card.sides ?? [])
    for (const x of s.examples ?? []) {
      const score = overlap(qTokens, `${x.en ?? ""} ${x.es}`);
      if (score > bestScore) {
        bestScore = score;
        es = x.es;
        en = x.en;
      }
    }
  const cores = (card.sides ?? []).filter((s) => s.core).map((s) => `${s.word}: ${s.core}`);
  return {
    kind: "answer",
    area: "verbs",
    headline: card.tagline ? `${card.title} — ${card.tagline}` : card.title,
    es,
    en,
    why: cores.slice(0, 2).join(" ") || card.tricky || "See the card for the full contrast.",
    link: cardLink(card),
  };
}

interface WordRole {
  word: string;
  display: string;
  verb: string;
  kind: "verb" | "noun";
  meaning?: string | undefined;
}

/** Dictionary-status wording only; it never supplies lesson examples or card evidence. */
function makeUnlisted(term: string, reference: string, entry: OffPackWord): AskUnlisted {
  const display = displayOffPack(reference);
  const suggestion = term === reference ? "" : `“${term}” looks like “${display}”. `;
  const relation = entry.kind === "noun"
    ? `“${display}” is a noun meaning “${entry.meaning}”, associated with ${entry.verb}.`
    : `“${display}” means “${entry.meaning}”.`;
  return {
    term,
    verb: entry.verb,
    note: `${suggestion}${relation} ${entry.verb} isn't currently covered by a Verb Wise lesson.`,
  };
}

/** Explain only a directly recognised, same-root verb/noun comparison. */
function makeDistinction(roles: WordRole[]): string | undefined {
  for (let i = 0; i < roles.length; i++) {
    for (let j = i + 1; j < roles.length; j++) {
      const a = roles[i]!;
      const b = roles[j]!;
      if (a.verb !== b.verb || a.kind === b.kind) continue;
      const noun = a.kind === "noun" ? a : b;
      const verb = a.kind === "verb" ? a : b;
      return `“${verb.display}” is a verb form of ${a.verb}, while “${noun.display}” is a noun meaning “${noun.meaning ?? "the related idea"}”. They come from the same verb but do different jobs in a sentence.`;
    }
  }
  return undefined;
}

/* --------------------------------------------------------------- main --- */

/**
 * Entry point: interpret one question against the supplied data.
 * Pipeline: normalise -> mood intent -> ambiguous "I was" -> Spanish words on cards
 * -> English meaning hints -> unknown-verb fallback -> generic fallback.
 * Pure and synchronous, so it is easy to test and costs no network calls.
 */
export function ask(question: string, data: AskData): AskResult {
  const q = normalise(question.slice(0, MAX_QUESTION_LENGTH));
  if (q.replace(/\s/g, "").length < 2) return { kind: "empty" };
  const qTokens = new Set(q.split(" ").filter((w) => w.length > 2));
  const cardById = new Map(data.cards.map((c) => [c.id, c]));
  const idx = buildIndex(data.cards);

  // 1. Mood (indicative / present / imperfect subjunctive).
  const mood = moodIntent(q);
  if (mood === "ambiguous-know") {
    return {
      kind: "clarify",
      question: "Do you mean you're unsure whether something is true, or that you know a fact?",
      options: [
        { label: "I doubt it's true", query: "I doubt that he is right" },
        { label: "I know it's true", query: "I know that he is right" },
      ],
    };
  }
  if (mood === "indicative") {
    const support = findMoodSupport({ tense: "present", trigger: "no creo que", why: "" }, data, qTokens);
    if (!support) return outOfScope();
    return {
      kind: "answer",
      area: "indicative",
      headline: "Use the normal (indicative) verb after an affirmative belief or certainty — creo que, sé que, estoy seguro de que.",
      why: `Only when the belief is denied or doubted does the subjunctive follow. Compare the negative version: ${support.es}`,
      es: support.es,
      en: support.en,
      link: { to: "/subjunctive/present/$entryId", params: { entryId: support.entry.id }, label: "See the “no creo que” lesson" },
    };
  }
  if (mood) {
    const support = findMoodSupport(mood, data, qTokens);
    if (!support) return outOfScope();
    const tenseName = mood.tense === "present" ? "present subjunctive" : "imperfect subjunctive";
    const to = mood.tense === "present" ? "/subjunctive/present/$entryId" : "/subjunctive/imperfect/$entryId";
    return {
      kind: "answer",
      area: mood.tense,
      headline: `Use “${mood.trigger}” + ${tenseName}.`,
      es: support.es,
      en: support.en,
      why: `${mood.why} ${support.form ? `Here: ${support.form}.` : ""}`.trim(),
      link: { to, params: { entryId: support.entry.id }, label: `Open “${support.entry.title}” (${tenseName})` },
    } as AskResult;
  }

  // 2. Bare "I was / it was" with no context: genuinely ambiguous.
  const wasOnly = /\b(?:i|it|he|she|you|we|they) (?:was|were)\b/.test(q) && q.split(" ").length <= 9 && !/\b(?:fue|era|estaba|ser|estar)\b/.test(q);
  if (wasOnly) {
    const opts = [
      cardById.get("fue-vs-era") && { label: "A finished event vs a description (fue / era)", query: "fue or era" },
      cardById.get("ser-vs-estar") && { label: "Identity vs a temporary state (ser / estar)", query: "ser or estar" },
    ].filter(Boolean) as { label: string; query: string }[];
    if (opts.length)
      return { kind: "clarify", question: "“I was” depends on meaning. Which are you trying to say?", options: opts };
  }

  // 3. Verb-pair cards: Spanish words named in the question.
  // Words map to headwords directly, through an explicit form, or through an ending
  // guess that is accepted only when it is a real headword on a card.
  const mentioned = new Set<string>();
  let missingVerb: string | undefined;
  const headwords = new Set([...idx.deckWords].filter((w) => /(?:ar|er|ir)(?:se)?$/.test(w)));
  const forms = buildFormIndex(headwords, [data.present, data.imperfect], data);
  const nearest: { verb: string; reason: string }[] = [];
  const words = q.split(" ");
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    if (idx.deckWords.has(w)) { mentioned.add(w); continue; }
    const homo = HOMOGRAPHS[w];
    if (homo) {
      const prev = words[i - 1];
      if (homo.verb && headwords.has(homo.verb) && prev && VERB_CONTEXT.has(prev)) mentioned.add(homo.verb);
      else if (homo.verb && headwords.has(homo.verb)) nearest.push({ verb: homo.verb, reason: `“${w}” can be a form of ${homo.verb}, but it can also be ${homo.other}.` });
      continue;
    }
    const form = forms.forms.get(w);
    if (form) {
      for (const v of form.verbs) if (idx.deckWords.has(v)) mentioned.add(v);
      continue;
    }
    const bad = forms.wrong.get(w);
    if (bad) {
      const verb = bad.verb || EXPLICIT_FORMS[stripAccents(bad.correct ?? "")] || "";
      if (headwords.has(verb)) nearest.push({ verb, reason: `“${w}” isn't standard Spanish${bad.correct ? ` — the correct form is “${bad.correct}”` : ""} (${verb}).` });
      continue;
    }
    const { explicit, guesses } = verbCandidates(w);
    if (explicit) {
      if (idx.deckWords.has(explicit)) mentioned.add(explicit);
      else missingVerb ??= explicit;
      continue;
    }
    const hit = guesses.find((g) => idx.deckWords.has(g));
    if (hit) { mentioned.add(hit); continue; }
    const pool: [string, string][] = [];
    for (const [f, v] of forms.forms) for (const verb of v.verbs) pool.push([f, verb]);
    for (const h of headwords) pool.push([h, h]);
    for (const [f, v] of Object.entries(EXPLICIT_FORMS)) if (headwords.has(v) && f.length >= 4) pool.push([f, v]);
    const fz = fuzzyVerb(w, pool);
    if (fz) nearest.push({ verb: fz.verb, reason: `“${w}” looks like a misspelling of “${fz.form}” (${fz.verb}).` });
  }
  if (mentioned.size) {
    const counts = new Map<string, number>();
    for (const w of mentioned) for (const id of idx.cardsByWord.get(w) ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
    const ranked = [...counts].sort((a, b) => b[1] - a[1]);
    const tied = ranked.filter(([, n]) => n === ranked[0]![1]);
    if (tied.length === 1) {
      const r = cardAnswer(cardById.get(tied[0]![0])!, qTokens);
      const note = EXTRA_NOTES.find(([re]) => re.test(q));
      return note && r.kind === "answer" ? { ...r, extra: note[1] } : r;
    }
    return {
      kind: "clarify",
      question: "That word appears in more than one lesson. Which contrast do you mean?",
      options: tied.slice(0, 3).map(([id]) => ({ label: cardById.get(id)!.title, query: cardById.get(id)!.title })),
    };
  }

  // Probable but unconfirmed readings: offer the nearest cards, never a definite answer.
  if (nearest.length) {
    const options: { link: LessonLink; reason: string }[] = [];
    const seen = new Set<string>();
    for (const n of nearest)
      for (const id of idx.cardsByWord.get(n.verb) ?? [])
        if (!seen.has(id) && options.length < 3) { seen.add(id); options.push({ link: cardLink(cardById.get(id)!), reason: n.reason }); }
    if (options.length) return { kind: "nearest", title: "This is probably what you mean:", options };
  }

  // A trusted form whose verb is on no card: that verb genuinely isn't listed.
  if (missingVerb) return notListed();

  // 4. English meanings ("how do I say to know").
  for (const [re, id] of MEANING_HINTS) {
    const card = cardById.get(id);
    if (card && re.test(q)) return cardAnswer(card, qTokens);
  }

  // 5. Unknown Spanish verb.
  const asksAboutVerb = /\b(?:verb|verbo|vs|versus|conjugate|conjugar|use|usar|mean|means|significa|difference|diferencia)\b/.test(q);
  const unknownVerb = asksAboutVerb && q.split(" ").find((w) => w.length >= 4 && /(?:ar|er|ir)$/.test(w) && !idx.deckWords.has(w) && !NOT_VERBS.has(w));
  if (unknownVerb) return notListed();
  return outOfScope();
}

/** Shown only when the underlying verb is not a headword on any card. */
function notListed(): AskResult {
  return {
    kind: "fallback",
    title: "Sorry, that verb isn't currently listed in Verb Wise.",
    message: "Try another verb or phrase, or search for a related grammatical topic.",
  };
}

/** Shared fallback when no recognised intent is backed by a real entry. */
function outOfScope(): AskResult {
  return {
    kind: "fallback",
    title: "I couldn't match that to a Verb Wise lesson.",
    message: "Try describing the sentence you want to say, for example “I don't think he is right” or “ser or estar”.",
  };
}

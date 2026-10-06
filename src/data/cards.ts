import rawCards from "./verbs.json";

export interface CardExample {
  es: string;
  en?: string;
  note?: string;
}

export interface CardSide {
  word: string;
  core?: string;
  examples?: CardExample[];
}

export interface VerbCard {
  id: string;
  category?: string;
  title: string;
  tagline?: string;
  sides?: CardSide[];
  tricky?: string;
}

/** Single source of truth: the JSON dataset. Add cards to verbs.json only. */
export const cards: VerbCard[] = rawCards as VerbCard[];

export const cardCount = cards.length;

/** Dev-only dataset checks. Logs warnings; never modifies the data. */
const ORIGINAL_COUNT = 43;
if (import.meta.env.DEV) {
  const origin = (i: number) => (i < ORIGINAL_COUNT ? "original" : "new");
  const idPos = new Map<string, number[]>();
  cards.forEach((c, i) => {
    const missing = (["id", "title", "sides", "tricky"] as const).filter((k) => !c[k]);
    if (missing.length) console.warn(`[verbs] Card #${i + 1} (${c.id ?? "no id"}) missing: ${missing.join(", ")}`);
    if (c.id) idPos.set(c.id, [...(idPos.get(c.id) ?? []), i + 1]);
  });
  for (const [id, pos] of idPos) if (pos.length > 1) console.warn(`[verbs] Duplicate id "${id}" at positions ${pos.join(", ")}`);

  const pairs = new Map<string, number[]>();
  const words = new Map<string, number[]>();
  cards.forEach((c, i) => {
    const ws = Array.from(new Set((c.sides ?? []).map((s) => s.word.trim().toLowerCase())));
    const key = [...ws].sort().join(" | ");
    if (key) pairs.set(key, [...(pairs.get(key) ?? []), i]);
    for (const w of ws) words.set(w, [...(words.get(w) ?? []), i]);
  });
  for (const [key, idx] of pairs) {
    if (idx.length < 2) continue;
    const kinds = Array.from(new Set(idx.map(origin))).sort().join(" vs ");
    console.warn(`[verbs] Duplicate verb card (${kinds}): ${key} — ids: ${idx.map((i) => `${cards[i]!.id} (${origin(i)})`).join(", ")}`);
  }
  const shared = [...words].filter(([, idx]) => idx.length > 1);
  if (shared.length) {
    console.groupCollapsed(`[verbs] ${shared.length} verb(s) appear on more than one card (check only)`);
    for (const [w, idx] of shared) console.info(`${w}: ${idx.map((i) => `${cards[i]!.id} (${origin(i)})`).join(", ")}`);
    console.groupEnd();
  }
}

const byId = new Map(cards.map((c) => [c.id, c]));

export function getCard(id: string): VerbCard | undefined {
  return byId.get(id);
}

export function getCardIndex(id: string): number {
  return cards.findIndex((c) => c.id === id);
}

export function getNeighbours(id: string): { prev?: VerbCard | undefined; next?: VerbCard | undefined } {
  const i = getCardIndex(id);
  if (i < 0) return {};
  const n = cards.length;
  if (n < 2) return {};
  return { prev: cards[(i - 1 + n) % n], next: cards[(i + 1) % n] };
}

export function getCategories(): string[] {
  return Array.from(new Set(cards.map((c) => c.category).filter(Boolean) as string[]));
}

/** Every searchable text fragment for a card, derived generically from the data. */
export function searchableText(card: VerbCard): string {
  const parts: string[] = [card.title, card.tagline ?? "", card.category ?? "", card.tricky ?? ""];
  for (const side of card.sides ?? []) {
    parts.push(side.word, side.core ?? "");
    for (const ex of side.examples ?? []) {
      parts.push(ex.es, ex.en ?? "", ex.note ?? "");
    }
  }
  return parts.join(" \u0000 ");
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const searchIndex = cards.map((card) => ({ card, haystack: normalise(searchableText(card)) }));

export function searchCards(query: string): VerbCard[] {
  const q = normalise(query.trim());
  if (!q) return [];
  const terms = q.split(/\s+/);
  return searchIndex
    .filter(({ haystack }) => terms.every((t) => haystack.includes(t)))
    .map(({ card }) => card);
}

export function cardWords(card: VerbCard): string[] {
  return (card.sides ?? []).map((s) => s.word);
}

export function exampleCount(card: VerbCard): number {
  return (card.sides ?? []).reduce((n, s) => n + (s.examples?.length ?? 0), 0);
}

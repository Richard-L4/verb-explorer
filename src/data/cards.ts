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

const byId = new Map(cards.map((c) => [c.id, c]));

export function getCard(id: string): VerbCard | undefined {
  return byId.get(id);
}

export function getCardIndex(id: string): number {
  return cards.findIndex((c) => c.id === id);
}

export function getNeighbours(id: string): { prev?: VerbCard; next?: VerbCard } {
  const i = getCardIndex(id);
  if (i < 0) return {};
  return { prev: cards[i - 1], next: cards[i + 1] };
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

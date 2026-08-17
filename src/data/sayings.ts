import rawSayings from "./sayings.json";

export interface SayingExample {
  context: string;
  es: string;
  note?: string;
}

export interface SayingCard {
  id: string;
  category?: string;
  title: string;
  vibe?: string;
  literal_fail?: string;
  examples?: SayingExample[];
}

/** Single source of truth: the JSON dataset. Add sayings to sayings.json only. */
export const sayings: SayingCard[] = rawSayings as SayingCard[];

export const sayingCount = sayings.length;

const byId = new Map(sayings.map((s) => [s.id, s]));

export function getSaying(id: string): SayingCard | undefined {
  return byId.get(id);
}

export function getSayingIndex(id: string): number {
  return sayings.findIndex((s) => s.id === id);
}

export function getSayingNeighbours(id: string): { prev?: SayingCard | undefined; next?: SayingCard | undefined } {
  const i = getSayingIndex(id);
  if (i < 0) return {};
  return { prev: sayings[i - 1], next: sayings[i + 1] };
}

export function sayingExampleCount(saying: SayingCard): number {
  return saying.examples?.length ?? 0;
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function searchableText(saying: SayingCard): string {
  const parts: string[] = [saying.title, saying.vibe ?? "", saying.literal_fail ?? ""];
  for (const ex of saying.examples ?? []) {
    parts.push(ex.context, ex.es, ex.note ?? "");
  }
  return parts.join(" \u0000 ");
}

const searchIndex = sayings.map((saying) => ({ saying, haystack: normalise(searchableText(saying)) }));

export function searchSayings(query: string): SayingCard[] {
  const q = normalise(query.trim());
  if (!q) return [];
  const terms = q.split(/\s+/);
  return searchIndex.filter(({ haystack }) => terms.every((t) => haystack.includes(t))).map(({ saying }) => saying);
}
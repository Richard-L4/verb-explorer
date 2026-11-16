/**
 * Shared saying-card types and lookups for browser and server callers.
 * The browser imports only the generated sayings.public.json; sayings.json and
 * northAmericanExpressions.json are read only by sayings-full.server.ts.
 */
import pubJson from "./sayings.public.json";

// The browser gets names only; full sayings arrive from the server for a trial or purchase.
const pub = pubJson as unknown as {
  sayings: unknown[];
  categories: Record<"american" | "canadian", { id: string; heading: string }[]>;
  collectionIntroductions: Record<string, string>;
  statusDefinitions: Record<string, string>;
  overview: string;
  sourceLimitations: string[];
};

export interface SayingExample {
  context: string;
  es: string;
  note?: string;
}

export type SayingRegion = "british" | "american" | "canadian";

export const sayingRegions: { key: SayingRegion; label: string }[] = [
  { key: "british", label: "British English" },
  { key: "american", label: "American English" },
  { key: "canadian", label: "Canadian English" },
];

export interface SayingCard {
  id: string;
  region: SayingRegion;
  category?: string;
  /** Display heading for the category, from the source collection (North American only). */
  categoryHeading?: string;
  meaning?: string;
  spanish?: string;
  /** Verification label exactly as supplied, e.g. "DLE" or "DLE (partial)". */
  status?: string;
  verificationNote?: string;
  exampleEnglish?: string;
  exampleSpanish?: string;
  title: string;
  vibe?: string;
  literal_fail?: string;
  examples?: SayingExample[];
}

const publicList = pub.sayings as SayingCard[];

/** Current collection as this browser is entitled to see it. Mutated in place by setSayingContent. */
export const sayings: SayingCard[] = [...publicList];

export const sayingCount = sayings.length;

export function sayingsInRegion(region: SayingRegion): SayingCard[] {
  return sayings.filter((s) => s.region === region);
}

export const sayingCountByRegion: Record<SayingRegion, number> = {
  british: sayingsInRegion("british").length,
  american: sayingsInRegion("american").length,
  canadian: sayingsInRegion("canadian").length,
};

/** Category headings in source order for a North American region. */
export function regionCategories(region: "american" | "canadian"): { id: string; heading: string }[] {
  return pub.categories[region];
}

export const regionIntroductions = pub.collectionIntroductions;
export const statusDefinitions = pub.statusDefinitions;
export const verificationOverview = pub.overview;
export const sourceLimitations = pub.sourceLimitations;

const byId = new Map(sayings.map((s) => [s.id, s]));

/** Swaps in the server-supplied full collection, or back to names only when null. Memory only. */
export function setSayingContent(full: SayingCard[] | null): void {
  const src = full && full.length === publicList.length ? full : publicList;
  sayings.splice(0, sayings.length, ...src);
  byId.clear();
  for (const s of sayings) byId.set(s.id, s);
  searchIndex = sayings.map((saying) => ({ saying, haystack: normalise(searchableText(saying)) }));
}

export function getSaying(id: string): SayingCard | undefined {
  return byId.get(id);
}

/** Position within the saying's own region (0-based). */
export function getSayingIndex(id: string): number {
  const saying = byId.get(id);
  if (!saying) return -1;
  return sayingsInRegion(saying.region).findIndex((s) => s.id === id);
}

/** Previous/next stay inside the saying's own region. */
export function getSayingNeighbours(id: string): { prev?: SayingCard | undefined; next?: SayingCard | undefined } {
  const saying = byId.get(id);
  if (!saying) return {};
  const list = sayingsInRegion(saying.region);
  const i = list.findIndex((s) => s.id === id);
  return { prev: list[i - 1], next: list[i + 1] };
}

export function sayingExampleCount(saying: SayingCard): number {
  if (saying.exampleSpanish) return 1;
  return saying.examples?.length ?? 0;
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function searchableText(saying: SayingCard): string {
  const parts: string[] = [
    saying.title,
    saying.vibe ?? "",
    saying.literal_fail ?? "",
    saying.meaning ?? "",
    saying.spanish ?? "",
    saying.exampleEnglish ?? "",
    saying.exampleSpanish ?? "",
  ];
  for (const ex of saying.examples ?? []) {
    parts.push(ex.context, ex.es, ex.note ?? "");
  }
  return parts.join(" \u0000 ");
}

let searchIndex = sayings.map((saying) => ({ saying, haystack: normalise(searchableText(saying)) }));

export function searchSayings(query: string): SayingCard[] {
  const q = normalise(query.trim());
  if (!q) return [];
  const terms = q.split(/\s+/);
  return searchIndex.filter(({ haystack }) => terms.every((t) => haystack.includes(t))).map(({ saying }) => saying);
}
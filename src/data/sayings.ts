/**
 * Shared saying-card types and lookups for browser and server callers.
 * Depends on sayings.json, keeping content edits separate from application logic.
 */
import rawSayings from "./sayings.json";
import northAmerican from "./northAmericanExpressions.json";

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

interface NorthAmericanEntry {
  id: string;
  category: string;
  english: string;
  meaning: string;
  spanish: string;
  status: string;
  verificationNote: string;
  exampleEnglish: string;
  exampleSpanish: string;
}

/** Source files are the single source of truth: British in sayings.json, North American in northAmericanExpressions.json. Text is passed through unchanged. */
const british: SayingCard[] = (rawSayings as Omit<SayingCard, "region">[]).map((s) => ({ ...s, region: "british" }));

function fromNorthAmerica(region: "american" | "canadian"): SayingCard[] {
  const headings = new Map(northAmerican.categories[region].map((c) => [c.id, c.heading]));
  return (northAmerican.collections[region] as NorthAmericanEntry[]).map((e) => ({
    id: e.id,
    region,
    category: e.category,
    categoryHeading: headings.get(e.category),
    title: e.english,
    meaning: e.meaning,
    spanish: e.spanish,
    status: e.status,
    verificationNote: e.verificationNote,
    exampleEnglish: e.exampleEnglish,
    exampleSpanish: e.exampleSpanish,
  }));
}

export const sayings: SayingCard[] = [...british, ...fromNorthAmerica("american"), ...fromNorthAmerica("canadian")];

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
  return northAmerican.categories[region];
}

export const regionIntroductions = northAmerican.sourceNotes.collectionIntroductions;
export const statusDefinitions = northAmerican.verificationNotes.statusDefinitions;
export const verificationOverview = northAmerican.verificationNotes.overview;
export const sourceLimitations = northAmerican.verificationNotes.sourceLimitations;

const byId = new Map(sayings.map((s) => [s.id, s]));

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

const searchIndex = sayings.map((saying) => ({ saying, haystack: normalise(searchableText(saying)) }));

export function searchSayings(query: string): SayingCard[] {
  const q = normalise(query.trim());
  if (!q) return [];
  const terms = q.split(/\s+/);
  return searchIndex.filter(({ haystack }) => terms.every((t) => haystack.includes(t))).map(({ saying }) => saying);
}
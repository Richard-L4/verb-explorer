/**
 * Pure builders for sayings, shared by the server module, the generator script and tests.
 * The source files are passed in unchanged; nothing here edits them.
 */
import type { SayingCard } from "@/data/sayings";

export interface NorthAmericanSource {
  categories: Record<"american" | "canadian", { id: string; heading: string }[]>;
  collections: Record<"american" | "canadian", unknown[]>;
  sourceNotes: { collectionIntroductions: unknown };
  verificationNotes: { statusDefinitions: unknown; overview: unknown; sourceLimitations: unknown };
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

function fromNorthAmerica(northAmerican: NorthAmericanSource, region: "american" | "canadian"): SayingCard[] {
  const headings = new Map(northAmerican.categories[region].map((c) => [c.id, c.heading]));
  return (northAmerican.collections[region] as NorthAmericanEntry[]).map((e) => ({
    id: e.id,
    region,
    category: e.category,
    categoryHeading: headings.get(e.category) ?? e.category,
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


/** Full collection in display order: British, then American, then Canadian. */
export function buildAllSayings(rawSayings: unknown[], northAmerican: NorthAmericanSource): SayingCard[] {
  const british = (rawSayings as Omit<SayingCard, "region">[]).map((s) => ({ ...s, region: "british" as const }));
  return [...british, ...fromNorthAmerica(northAmerican, "american"), ...fromNorthAmerica(northAmerican, "canadian")];
}

/** Browser-safe file: names and categories for every saying, plus the collection notes. No meanings or examples. */
export function buildPublicSayings(rawSayings: unknown[], northAmerican: NorthAmericanSource) {
  return {
    sayings: buildAllSayings(rawSayings, northAmerican).map((s) => {
      const out: SayingCard = { id: s.id, region: s.region, title: s.title };
      if (s.category) out.category = s.category;
      if (s.categoryHeading) out.categoryHeading = s.categoryHeading;
      return out;
    }),
    categories: northAmerican.categories,
    collectionIntroductions: northAmerican.sourceNotes.collectionIntroductions,
    statusDefinitions: northAmerican.verificationNotes.statusDefinitions,
    overview: northAmerican.verificationNotes.overview,
    sourceLimitations: northAmerican.verificationNotes.sourceLimitations,
  };
}

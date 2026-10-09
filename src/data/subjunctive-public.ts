/**
 * Browser-side subjunctive data. Only the generated public file is imported
 * here: titles for all entries, and Easy content for the 20 free entries.
 * Paid content arrives from the server (see use-subjunctive.ts).
 */
import publicEntries from "./subjunctive.public.json";
import type { PublicSubjunctiveEntry } from "@/lib/content-access";

export const publicSubjunctive = publicEntries as PublicSubjunctiveEntry[];
export const SUBJUNCTIVE_TOTAL = publicSubjunctive.length;
export const subjunctiveIds = publicSubjunctive.map((e) => e.id);

export function neighbours<T extends { id: string }>(list: T[], id: string) {
  const i = list.findIndex((e) => e.id === id);
  const n = list.length;
  if (i < 0 || n < 2) return { position: i + 1, total: n };
  return { prev: list[(i - 1 + n) % n], next: list[(i + 1) % n], position: i + 1, total: n };
}

const norm = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Searches only what the caller can see. */
export function searchSubjunctive<T extends PublicSubjunctiveEntry>(list: T[], query: string): T[] {
  const q = norm(query.trim());
  if (!q) return list;
  const terms = q.split(/\s+/);
  return list.filter((e) => {
    const hay = norm(
      [
        e.title,
        ...(e.triggers ?? []).flatMap((t) => [
          t.trigger,
          t.category,
          ...t.examples.flatMap((x) => [x.es, x.en, x.form]),
        ]),
      ].join(" \u0000 "),
    );
    return terms.every((t) => hay.includes(t));
  });
}

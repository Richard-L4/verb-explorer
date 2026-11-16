/**
 * Pure builder for the browser-safe verb deck (used by the generator script and tests).
 * Locked cards keep only id, category, title, tagline and the two verb words, so the
 * deck can be browsed and searched by name; examples, explanations and notes stay on the server.
 */
import type { VerbCard } from "@/data/cards";
import { verbCardLocked } from "./content-access";

export function buildPublicVerbs(full: VerbCard[]): VerbCard[] {
  return full.map((c) => {
    if (!verbCardLocked(c.id, false)) return c;
    const out: VerbCard = { id: c.id, title: c.title };
    if (c.category) out.category = c.category;
    if (c.tagline) out.tagline = c.tagline;
    if (c.sides) out.sides = c.sides.map((s) => ({ word: s.word }));
    return out;
  });
}

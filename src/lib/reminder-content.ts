/**
 * Daily reminder content, derived from the existing verb deck so every
 * notification carries real learning value. Pure and deterministic: the same
 * day always produces the same card, and consecutive days differ.
 */
import { cards } from "@/data/cards";

export interface ReminderContent {
  title: string;
  body: string;
  url: string;
  tag: string;
}

function dayIndex(date: Date): number {
  return Math.floor(date.getTime() / 86_400_000);
}

export function buildReminder(date: Date = new Date()): ReminderContent {
  const day = dayIndex(date);
  const card = cards[day % cards.length];

  if (!card) {
    return {
      title: "Spanish verb of the day 🇪🇸",
      body: "Open Verb Wise for today's verb contrast.",
      url: "/browse",
      tag: `verbwise-${day}`,
    };
  }

  const side = card.sides?.[day % Math.max(card.sides.length, 1)] ?? card.sides?.[0];
  const detail = side?.core ?? card.tagline ?? "Tap to see how it's used.";
  const lead = side?.word ? `${side.word} — ${detail}` : detail;

  return {
    title: "Spanish verb of the day 🇪🇸",
    body: lead.length > 140 ? `${lead.slice(0, 137)}…` : lead,
    url: `/card/${card.id}`,
    tag: `verbwise-${day}`,
  };
}

import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { VerbCard } from "@/data/cards";
import { cardWords, exampleCount } from "@/data/cards";
import { FavouriteButton } from "./FavouriteButton";
import { StatusPill } from "./StatusPill";

export function VerbCardTile({
  card,
  favourite,
  learned,
  studied,
  onToggleFavourite,
  index = 0,
}: {
  card: VerbCard;
  favourite: boolean;
  learned: boolean;
  studied: boolean;
  onToggleFavourite: (id: string) => void;
  index?: number;
}) {
  const words = cardWords(card);
  const examples = exampleCount(card);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.24), ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Link
        to="/card/$cardId"
        params={{ cardId: card.id }}
        className="surface-card group flex h-full flex-col gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-lift)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={learned ? "learned" : studied ? "studied" : "new"} />
            {card.category ? (
              <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {card.category}
              </span>
            ) : null}
          </div>
          <FavouriteButton active={favourite} label={card.title} onToggle={() => onToggleFavourite(card.id)} />
        </div>

        <div>
          <h3 className="font-display text-2xl font-semibold">{card.title}</h3>
          {words.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {words.map((w) => (
                <span key={w} className="rounded-lg bg-secondary px-2.5 py-1 text-sm font-medium text-secondary-foreground">
                  {w}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {card.tagline ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{card.tagline}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between border-t border-border/70 pt-4 text-sm text-muted-foreground">
          <span>{examples} example{examples === 1 ? "" : "s"}</span>
          <span className="inline-flex items-center gap-1 font-medium text-primary">
            Study
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

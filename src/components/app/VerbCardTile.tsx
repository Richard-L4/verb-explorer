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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.045, 0.28), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="h-full"
    >
      <Link
        to="/card/$cardId"
        params={{ cardId: card.id }}
        className="surface-card hairline-top group flex h-full flex-col gap-4 overflow-hidden p-5 transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)] sm:p-6"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        />
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={learned ? "learned" : studied ? "studied" : "new"} />
            {card.category ? (
              <span className="rounded-full border border-border/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {card.category}
              </span>
            ) : null}
          </div>
          <FavouriteButton active={favourite} label={card.title} onToggle={() => onToggleFavourite(card.id)} />
        </div>

        <div>
          <h3 className="font-display text-[1.6rem] font-bold leading-tight tracking-tight">{card.title}</h3>
          {words.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {words.map((w) => (
                <span
                  key={w}
                  className="rounded-lg border border-border/70 bg-secondary/70 px-2.5 py-1 text-sm font-semibold text-secondary-foreground"
                >
                  {w}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {card.tagline ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{card.tagline}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-4 text-sm text-muted-foreground">
          <span className="tabular-nums">{examples} example{examples === 1 ? "" : "s"}</span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
            Study
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

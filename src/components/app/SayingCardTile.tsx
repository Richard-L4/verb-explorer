import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { SayingCard } from "@/data/sayings";
import { sayingExampleCount } from "@/data/sayings";
import { FavouriteButton } from "./FavouriteButton";
import { StatusPill } from "./StatusPill";

export function SayingCardTile({
  saying,
  favourite,
  learned,
  studied,
  onToggleFavourite,
  index = 0,
}: {
  saying: SayingCard;
  favourite: boolean;
  learned: boolean;
  studied: boolean;
  onToggleFavourite: (id: string) => void;
  index?: number;
}) {
  const examples = sayingExampleCount(saying);
  const preview = saying.examples?.slice(0, 2) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.045, 0.28), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="h-full"
    >
      <Link
        to="/saying/$sayingId"
        params={{ sayingId: saying.id }}
        className="surface-card hairline-top group flex h-full flex-col gap-4 overflow-hidden p-5 transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)] sm:p-6"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-accent/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        />
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={learned ? "learned" : studied ? "studied" : "new"} />
            {saying.category ? (
              <span className="rounded-full border border-border/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {saying.category}
              </span>
            ) : null}
          </div>
          <FavouriteButton active={favourite} label={saying.title} onToggle={() => onToggleFavourite(saying.id)} />
        </div>

        <div>
          <h3 className="text-balance font-display text-[1.45rem] font-bold leading-tight tracking-tight">
            {saying.title}
          </h3>
          {preview.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {preview.map((ex) => (
                <span
                  key={ex.es}
                  lang="es"
                  className="rounded-lg border border-border/70 bg-secondary/70 px-2.5 py-1 text-sm font-semibold text-secondary-foreground"
                >
                  {ex.es}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {saying.vibe ? <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{saying.vibe}</p> : null}

        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-4 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {examples} way{examples === 1 ? "" : "s"} to say it
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
            Study
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { cards, getCategories } from "@/data/cards";
import { useLearner } from "@/hooks/use-learner";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { CardGrid } from "@/components/app/CardGrid";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/browse")({
  component: Browse,
  head: () => ({
    meta: [
      { title: "Browse Spanish verb cards | Verbo" },
      { name: "description", content: "Browse every Spanish verb contrast card, filter by learning state and save favourites." },
      { property: "og:title", content: "Browse Spanish verb cards | Verbo" },
      { property: "og:description", content: "Every verb contrast card in the deck, with progress and favourites." },
    ],
  }),
});

type Filter = "all" | "learned" | "unlearned" | "favourites";

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unlearned", label: "Still learning" },
  { key: "learned", label: "Learned" },
  { key: "favourites", label: "Favourites" },
];

function Browse() {
  const { isLearned, isFavourite } = useLearner();
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<string>("all");
  const categories = useMemo(() => getCategories(), []);

  const visible = cards.filter((c) => {
    if (category !== "all" && c.category !== category) return false;
    if (filter === "learned") return isLearned(c.id);
    if (filter === "unlearned") return !isLearned(c.id);
    if (filter === "favourites") return isFavourite(c.id);
    return true;
  });

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Browse"
        title="The whole deck"
        description={`${cards.length} verb contrast cards. Tap any card to study it in detail.`}
      />

      <div className="surface-panel mb-7 flex flex-wrap items-center gap-2 p-2.5">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "min-h-10 rounded-full border px-4 text-sm font-semibold transition-all duration-200",
              filter === f.key
                ? "border-primary/50 bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                : "border-border/70 bg-card/60 text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
        {categories.length > 1
          ? [{ key: "all", label: "All categories" }, ...categories.map((c) => ({ key: c, label: c }))].map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={category === c.key}
                onClick={() => setCategory(c.key)}
                className={cn(
                  "min-h-10 rounded-full border px-4 text-sm font-semibold capitalize transition-colors duration-200",
                  category === c.key
                    ? "border-accent/50 bg-accent/12 text-accent"
                    : "border-border/70 text-muted-foreground hover:text-foreground",
                )}
              >
                {c.label}
              </button>
            ))
          : null}
      </div>

      {visible.length ? (
        <CardGrid cards={visible} />
      ) : (
        <p className="surface-card p-12 text-center text-sm text-muted-foreground">
          No cards match this filter yet.
        </p>
      )}
    </PageTransition>
  );
}

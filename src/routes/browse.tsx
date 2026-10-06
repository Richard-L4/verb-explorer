import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

const PAGE = 24;
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
      { title: "Browse Spanish verb cards | Verbs" },
      { name: "description", content: "Browse every Spanish verb contrast card, filter by learning state and save favourites." },
      { property: "og:title", content: "Browse Spanish verb cards | Verbs" },
      { property: "og:description", content: "Every verb contrast card in the deck, with progress and favourites." },
    ],
  }),
});

type Filter = "all" | "learned" | "unlearned" | "favourites";

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unlearned", label: "Not yet learned" },
  { key: "learned", label: "Learned" },
  { key: "favourites", label: "Favourites" },
];

function Browse() {
  const { isLearned, isFavourite } = useLearner();
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<string>("all");
  const categories = useMemo(() => getCategories(), []);

  const [sort, setSort] = useState<"dataset" | "az">("dataset");
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [filter, category, sort]);

  const filtered = cards.filter((c) => {
    if (category !== "all" && c.category !== category) return false;
    if (filter === "learned") return isLearned(c.id);
    if (filter === "unlearned") return !isLearned(c.id);
    if (filter === "favourites") return isFavourite(c.id);
    return true;
  });
  const sorted = sort === "az" ? [...filtered].sort((a, b) => a.title.localeCompare(b.title, "es")) : filtered;
  const visible = sorted.slice(0, shown);

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
        <button
          type="button"
          onClick={() => setSort((s) => (s === "az" ? "dataset" : "az"))}
          aria-label={`Sort: ${sort === "az" ? "A–Z" : "Dataset order"}. Click to switch.`}
          className="ml-auto min-h-10 rounded-full border border-border/70 px-4 text-sm font-semibold text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          Sort: {sort === "az" ? "A–Z" : "Dataset order"}
        </button>
      </div>

      {visible.length ? (
        <>
          <CardGrid cards={visible} />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Showing {visible.length} of {sorted.length}
          </p>
          {visible.length < sorted.length ? (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-6 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-secondary"
              >
                Load more
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="surface-card p-12 text-center text-sm text-muted-foreground">
          No cards match this filter yet.
        </p>
      )}
    </PageTransition>
  );
}

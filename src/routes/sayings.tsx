import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { sayings, sayingCount, searchSayings } from "@/data/sayings";
import { useLearner } from "@/hooks/use-learner";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { SayingGrid } from "@/components/app/SayingGrid";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sayings")({
  component: Sayings,
  head: () => ({
    meta: [
      { title: "Sayings — British phrases in natural Spanish | Verbs" },
      {
        name: "description",
        content:
          "British sayings and idioms rendered in natural Spanish, with the tone, context and literal traps behind each phrase.",
      },
      { property: "og:title", content: "Sayings — British phrases in natural Spanish | Verbs" },
      {
        property: "og:description",
        content: "Idiomatic Spanish for British sayings, with context, tone and the literal translations to avoid.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

function Sayings() {
  const { isLearned, isFavourite } = useLearner();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const base = query.trim() ? searchSayings(query) : sayings;
  const visible = base.filter((s) => {
    if (filter === "learned") return isLearned(s.id);
    if (filter === "unlearned") return !isLearned(s.id);
    if (filter === "favourites") return isFavourite(s.id);
    return true;
  });

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Sayings"
        title="How you'd actually say it"
        description={`${sayingCount} British sayings with the natural Spanish that carries the same tone — plus the literal translations that don't work.`}
      />

      <div className="surface-panel mb-7 flex flex-col gap-3 p-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
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
        </div>

        <div className="relative sm:w-72">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search sayings"
            placeholder="Search sayings"
            className="min-h-10 w-full rounded-full border border-border/70 bg-card/60 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
      </div>

      {visible.length ? (
        <SayingGrid sayings={visible} />
      ) : (
        <p className="surface-card p-12 text-center text-sm text-muted-foreground">No sayings match this filter yet.</p>
      )}
    </PageTransition>
  );
}
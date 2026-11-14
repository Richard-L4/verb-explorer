/*
 * Saying catalogue at /sayings, with search supplied by sayings.ts.
 * useLearner supplies saved progress for filtering; SayingGrid links to the detail
 * route, where the sayings access gate and Paywall are applied.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import {
  sayings,
  sayingCount,
  sayingCountByRegion,
  sayingRegions,
  searchSayings,
  regionCategories,
  regionIntroductions,
  type SayingRegion,
} from "@/data/sayings";
import { useLearner } from "@/hooks/use-learner";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { SayingGrid } from "@/components/app/SayingGrid";
import { cn } from "@/lib/utils";

// createFileRoute connects this filename to its URL in the generated route tree.
export const Route = createFileRoute("/sayings")({
  component: Sayings,
  // head supplies document titles and metadata, not visible page content.
  head: () => ({
    meta: [
      { title: "Sayings — English expressions in natural Spanish | Verbs" },
      {
        name: "description",
        content:
          `${sayingCount} English expressions with Spanish equivalents — British, American and Canadian English.`,
      },
      { property: "og:title", content: "Sayings — English expressions in natural Spanish | Verbs" },
      {
        property: "og:description",
        content: `${sayingCount} English expressions with Spanish equivalents — British, American and Canadian English.`,
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
  // This custom hook (a reusable React function) subscribes to browser-saved learner
  // state, so progress changes update this page without a manual refresh.
  const { isLearned, isFavourite } = useLearner();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<SayingRegion | "all">("all");

  const base = query.trim() ? searchSayings(query) : sayings;
  const visible = base.filter((s) => {
    if (region !== "all" && s.region !== region) return false;
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
        description={`${sayingCount} English expressions with Spanish equivalents — British, American and Canadian English.`}
      />

      <div role="group" aria-label="English variety" className="mb-3 flex flex-wrap items-center gap-2">
        {[{ key: "all" as const, label: "All", count: sayingCount }, ...sayingRegions.map((r) => ({ ...r, count: sayingCountByRegion[r.key] }))].map(
          (r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={region === r.key}
              onClick={() => setRegion(r.key)}
              className={cn(
                "min-h-10 rounded-full border px-4 text-sm font-semibold transition-all duration-200",
                region === r.key
                  ? "border-accent/50 bg-accent text-accent-foreground"
                  : "border-border/70 bg-card/60 text-muted-foreground hover:border-accent/40 hover:text-foreground",
              )}
            >
              {r.label} <span className="tabular-nums opacity-80">({r.count})</span>
            </button>
          ),
        )}
      </div>

      {region === "american" || region === "canadian" ? (
        <section className="surface-card mb-5 p-5 sm:p-6">
          <h2 className="text-lg font-bold">{regionIntroductions[region].heading}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{regionIntroductions[region].text}</p>
        </section>
      ) : null}

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

      {!visible.length ? (
        <p className="surface-card p-12 text-center text-sm text-muted-foreground">No expressions match this selection.</p>
      ) : region === "american" || region === "canadian" ? (
        <div className="space-y-8">
          {regionCategories(region).map((c) => {
            const group = visible.filter((s) => s.category === c.id);
            if (!group.length) return null;
            return (
              <section key={c.id} aria-label={c.heading}>
                <h2 className="mb-4 text-xl font-bold">{c.heading}</h2>
                <SayingGrid sayings={group} />
              </section>
            );
          })}
        </div>
      ) : (
        <SayingGrid sayings={visible} />
      )}
    </PageTransition>
  );
}
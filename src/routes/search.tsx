import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search as SearchIcon, SearchX } from "lucide-react";
import { searchCards, cardCount } from "@/data/cards";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { CardGrid } from "@/components/app/CardGrid";
import { EmptyState } from "@/components/app/EmptyState";

export const Route = createFileRoute("/search")({
  component: SearchPage,
  head: () => ({
    meta: [
      { title: "Search Spanish verbs | Verbs" },
      { name: "description", content: "Search Spanish verbs, English meanings, examples and usage notes as you type." },
      { property: "og:title", content: "Search Spanish verbs | Verbs" },
      { property: "og:description", content: "Instant search across every verb card, example and note." },
    ],
  }),
});

function SearchPage() {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const results = searchCards(query);

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Search"
        title="Find a verb"
        description="Search Spanish words, English meanings, examples and usage notes across all cards."
      />

      <div className="relative mb-8">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary" aria-hidden="true" />
        <input
          type="search"
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search verb cards"
          placeholder="Try 'estar', 'to be', 'deadline'…"
          className="h-15 w-full rounded-2xl border border-border bg-card/80 pl-12 pr-4 text-base shadow-[var(--shadow-card)] outline-none backdrop-blur transition-all duration-200 placeholder:text-muted-foreground hover:border-primary/35 focus:border-primary focus:shadow-[var(--shadow-glow)]"
        />
      </div>

      {!trimmed ? (
        <EmptyState
          icon={SearchIcon}
          title="Start typing to search"
          description={`Results update as you type across all ${cardCount} cards — verbs, translations, notes and tricky bits.`}
        />
      ) : results.length ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
            {results.length} result{results.length === 1 ? "" : "s"} for “{trimmed}”
          </p>
          <CardGrid cards={results} />
        </>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No matches"
          description={`Nothing in the deck matches “${trimmed}”. Try a shorter word or a different spelling.`}
        />
      )}
    </PageTransition>
  );
}

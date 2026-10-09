import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, Lock, Search as SearchIcon } from "lucide-react";
import {
  subjunctiveEntries,
  completeEntryCount,
  isEntryComplete,
  searchEntries,
} from "@/data/subjunctive";
import { useAccess } from "@/hooks/use-access";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";

const PAGE = 24;

export const Route = createFileRoute("/subjunctive/")({
  component: SubjunctiveList,
  head: () => ({
    meta: [
      { title: "Spanish subjunctive by verb | Verb Wise" },
      {
        name: "description",
        content:
          "Learn when Spanish needs the subjunctive: three triggers and nine graded examples for every verb pair.",
      },
      { property: "og:title", content: "Spanish subjunctive by verb | Verb Wise" },
      {
        property: "og:description",
        content:
          "Wish, doubt, emotion and more — the subjunctive triggers explained with real examples.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SubjunctiveList() {
  const { isLocked } = useAccess();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [shown, setShown] = useState(PAGE);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => setShown(PAGE), [debounced]);

  const results = debounced.trim() ? searchEntries(debounced) : subjunctiveEntries;
  const visible = results.slice(0, shown);

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Subjunctive"
        title="When Spanish needs the subjunctive"
        description={`${completeEntryCount} verb pairs, each with three triggers and nine graded examples.`}
      />

      <div className="relative mb-7">
        <SearchIcon
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search subjunctive entries"
          placeholder="Try 'quiero que', 'ojalá', 'seas'…"
          className="h-14 w-full rounded-2xl border border-border bg-card/80 pl-12 pr-4 text-base shadow-[var(--shadow-card)] outline-none backdrop-blur transition-all duration-200 placeholder:text-muted-foreground hover:border-primary/35 focus:border-primary focus:shadow-[var(--shadow-glow)]"
        />
      </div>

      {visible.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((entry, i) => {
            const locked = isLocked(entry.id);
            const complete = isEntryComplete(entry.id);
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: Math.min(i * 0.045, 0.28),
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -6 }}
                className="h-full"
              >
                <Link
                  to="/subjunctive/$entryId"
                  params={{ entryId: entry.id }}
                  className="surface-card hairline-top group flex h-full flex-col gap-4 overflow-hidden p-5 transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)] sm:p-6"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {locked ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                        <Lock className="size-3" aria-hidden="true" /> Locked
                      </span>
                    ) : !complete ? (
                      <span className="rounded-full border border-border/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Coming soon
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-display text-[1.6rem] font-bold leading-tight tracking-tight">
                    {entry.title}
                  </h3>
                  {complete && !locked ? (
                    <div className="flex flex-wrap gap-2">
                      {entry.triggers.map((t) => (
                        <span
                          key={t.trigger}
                          lang="es"
                          className="rounded-lg border border-border/70 bg-secondary/70 px-2.5 py-1 text-sm font-semibold text-secondary-foreground"
                        >
                          {t.trigger}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-4 text-sm text-muted-foreground">
                    <span className="capitalize">
                      {complete ? entry.triggers.map((t) => t.category).join(" · ") : "In progress"}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-primary">
                      {locked ? "Unlock" : "Study"}
                      <ArrowRight
                        className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <p className="surface-card p-12 text-center text-sm text-muted-foreground">
          No entries match “{debounced.trim()}”.
        </p>
      )}

      {visible.length ? (
        <>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Showing {visible.length} of {results.length}
          </p>
          {visible.length < results.length ? (
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
      ) : null}
    </PageTransition>
  );
}

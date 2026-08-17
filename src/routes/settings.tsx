import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Database } from "lucide-react";
import { useLearner } from "@/hooks/use-learner";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { cardCount } from "@/data/cards";

export const Route = createFileRoute("/settings")({
  component: Settings,
  head: () => ({
    meta: [
      { title: "Settings | Verbo" },
      { name: "description", content: "Manage your Verbo learning data, including resetting saved progress and favourites." },
      { property: "og:title", content: "Settings | Verbo" },
      { property: "og:description", content: "Manage saved progress, favourites and stored learning data." },
    ],
  }),
});

function Settings() {
  const { reset, studiedCount, learnedCount, state } = useLearner();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <PageTransition>
      <PageHeader eyebrow="Settings" title="Settings" description="Everything is stored in this browser only — no account, no server." />

      <section className="surface-card p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Database className="size-5 text-primary" aria-hidden="true" /> Stored data
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["Cards in dataset", cardCount],
            ["Cards studied", studiedCount],
            ["Cards learned", learnedCount],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-xl border border-border p-4">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-display text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted-foreground">
          {state.favourites.length} favourite{state.favourites.length === 1 ? "" : "s"} saved.
        </p>
      </section>

      <section className="surface-card mt-6 border-destructive/30 p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <AlertTriangle className="size-5 text-destructive" aria-hidden="true" /> Reset progress
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Clears favourites, learned cards and study history from this browser. Card content is unaffected. This can't be
          undone.
        </p>

        <AnimatePresence mode="wait" initial={false}>
          {confirming ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-5 rounded-xl border border-destructive/40 bg-destructive/5 p-4"
            >
              <p className="text-sm font-medium">Are you sure? All saved progress will be deleted.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setConfirming(false);
                    setDone(true);
                  }}
                  className="min-h-11 rounded-full bg-destructive px-5 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
                >
                  Yes, reset everything
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="min-h-11 rounded-full border border-border bg-card px-5 text-sm font-semibold transition-colors hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="start"
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setConfirming(true);
                setDone(false);
              }}
              className="mt-5 min-h-11 rounded-full border border-destructive/40 px-5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              Reset all progress
            </motion.button>
          )}
        </AnimatePresence>

        {done ? (
          <p role="status" className="mt-4 text-sm font-medium text-success">
            Progress cleared.
          </p>
        ) : null}
      </section>

      <section className="surface-card mt-6 p-6">
        <h2 className="text-xl font-semibold">About</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Verbo runs entirely in your browser from a single JSON dataset of {cardCount} verb cards. More cards can be added
          to the dataset without changing the app.
        </p>
      </section>
    </PageTransition>
  );
}

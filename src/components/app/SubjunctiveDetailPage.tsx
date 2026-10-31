import { ArrowLeft, ArrowRight, Loader2, Repeat } from "lucide-react";
import { neighbours } from "@/data/subjunctive-public";
import { useSubjunctiveTense } from "@/hooks/use-subjunctive";
import { Paywall } from "@/components/app/Paywall";
import { PageTransition } from "@/components/app/PageTransition";
import { ConfirmPurchase } from "@/components/app/ConfirmPurchase";
import { SubjunctiveEntryView } from "@/components/app/SubjunctiveEntryView";
import { SubjunctiveEntryLink, SubjunctiveTenseLink } from "@/components/app/SubjunctiveEntryLink";
import { tenseLabel, type Tense } from "@/data/subjunctive-tense";

/** Shared detail page for both tenses. Locked content shows the paywall. */
export function SubjunctiveDetailPage({ tense, id, title }: { tense: Tense; id: string; title?: string | undefined }) {
  const { entries, status, needsConfirm } = useSubjunctiveTense(tense);
  const other: Tense = tense === "present" ? "imperfect" : "present";
  const entry = entries.find((e) => e.id === id);
  const { prev, next, position, total } = neighbours(entries, id);

  return (
    <PageTransition>
      <SubjunctiveTenseLink
        tense={tense}
        className="group inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft
          className="size-4 transition-transform duration-300 group-hover:-translate-x-1"
          aria-hidden="true"
        />{" "}
        Back to {tenseLabel[tense].toLowerCase()} subjunctive
      </SubjunctiveTenseLink>

      {entry?.triggers ? (
        <SubjunctiveEntryView
          key={entry.id + status}
          entry={{ ...entry, triggers: entry.triggers }}
          meta={`Entry ${position} of ${total}`}
          tense={tense}
          aside={
            <SubjunctiveEntryLink
              tense={other}
              entryId={id}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              <Repeat className="size-4" aria-hidden="true" /> Switch to {tenseLabel[other].toLowerCase()} subjunctive
            </SubjunctiveEntryLink>
          }
        />
      ) : status === "checking" ? (
        <section className="surface-card mt-4 flex items-center justify-center gap-3 p-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Checking access…
        </section>
      ) : (
        <div className="mt-4">
          <section className="surface-card mb-4 p-6 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              {tenseLabel[tense]} subjunctive · requires full access
            </p>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
          </section>
          {needsConfirm ? <ConfirmPurchase /> : title ? <Paywall title={title} /> : <Paywall />}
        </div>
      )}

      {prev && next ? (
        <nav aria-label="Entry navigation" className="mt-8 grid gap-3 sm:grid-cols-2">
          <SubjunctiveEntryLink
            tense={tense}
            entryId={prev.id}
            className="surface-card group flex min-h-16 items-center gap-3 p-4 transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
          >
            <ArrowLeft className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Previous
              </span>
              <span className="block truncate font-display font-bold">{prev.title}</span>
            </span>
          </SubjunctiveEntryLink>
          <SubjunctiveEntryLink
            tense={tense}
            entryId={next.id}
            className="surface-card group flex min-h-16 items-center justify-end gap-3 p-4 text-right transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Next
              </span>
              <span className="block truncate font-display font-bold">{next.title}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
          </SubjunctiveEntryLink>
        </nav>
      ) : null}
    </PageTransition>
  );
}

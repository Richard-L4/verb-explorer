import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { publicSubjunctive, neighbours } from "@/data/subjunctive-public";
import { getCard } from "@/data/cards";
import { useSubjunctive } from "@/hooks/use-subjunctive";
import { Paywall } from "@/components/app/Paywall";
import { PageTransition } from "@/components/app/PageTransition";
import { ConfirmPurchase } from "@/components/app/ConfirmPurchase";
import { SubjunctiveEntryView } from "@/components/app/SubjunctiveEntryView";

export const Route = createFileRoute("/subjunctive/$entryId")({
  loader: ({ params }) => {
    const entry = publicSubjunctive.find((e) => e.id === params.entryId);
    if (!entry) throw notFound();
    // Only the id and title travel with the route. Content comes from the
    // public file (free Easy) or from the server after a verified purchase.
    return { id: entry.id, title: entry.title ?? getCard(entry.id)?.title };
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [{ title: "Entry not found | Verb Wise" }, { name: "robots", content: "noindex" }],
      };
    const t = `${loaderData.title} — subjunctive | Verb Wise`;
    const d = `When to use the subjunctive with ${loaderData.title}: three triggers and nine examples.`;
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: EntryDetail,
});

function EntryDetail() {
  const { id, title } = Route.useLoaderData();
  const { entries, status, needsConfirm } = useSubjunctive();
  const entry = entries.find((e) => e.id === id);
  const { prev, next, position, total } = neighbours(entries, id);

  return (
    <PageTransition>
      <Link
        to="/subjunctive"
        className="group inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft
          className="size-4 transition-transform duration-300 group-hover:-translate-x-1"
          aria-hidden="true"
        />{" "}
        Back to subjunctive
      </Link>

      {entry?.triggers ? (
        <SubjunctiveEntryView
          key={entry.id + status}
          entry={{ ...entry, triggers: entry.triggers }}
          meta={`Entry ${position} of ${total}`}
        />
      ) : status === "checking" ? (
        <section className="surface-card mt-4 flex items-center justify-center gap-3 p-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Checking access…
        </section>
      ) : (
        <div className="mt-4">
          <section className="surface-card mb-4 p-6 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              Subjunctive · requires full access
            </p>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
          </section>
          {needsConfirm ? <ConfirmPurchase /> : <Paywall title={title ?? undefined} />}
        </div>
      )}

      {prev && next ? (
        <nav aria-label="Entry navigation" className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            to="/subjunctive/$entryId"
            params={{ entryId: prev.id }}
            className="surface-card group flex min-h-16 items-center gap-3 p-4 transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
          >
            <ArrowLeft className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Previous
              </span>
              <span className="block truncate font-display font-bold">{prev.title}</span>
            </span>
          </Link>
          <Link
            to="/subjunctive/$entryId"
            params={{ entryId: next.id }}
            className="surface-card group flex min-h-16 items-center justify-end gap-3 p-4 text-right transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Next
              </span>
              <span className="block truncate font-display font-bold">{next.title}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
          </Link>
        </nav>
      ) : null}
    </PageTransition>
  );
}

/*
 * Imperfect detail at /subjunctive/imperfect/<entryId>; $entryId captures the URL ID.
 * The loader uses subjunctive-public metadata only, then SubjunctiveDetailPage
 * loads permitted content through the shared signed-pass server function.
 * Full examples stay in imperfect-subjunctive-full.server.ts; a local unlocked flag cannot authorise them.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { publicByTense } from "@/data/subjunctive-public";
import { getCard } from "@/data/cards";
import { SubjunctiveDetailPage } from "@/components/app/SubjunctiveDetailPage";

// createFileRoute connects this filename to its URL in the generated route tree.
export const Route = createFileRoute("/subjunctive/imperfect/$entryId")({
  // A loader prepares route data before rendering; useLoaderData reads its result below.
  // Loaders can also run during browser navigation: they are not a server-only boundary.
  loader: ({ params }) => {
    const entry = publicByTense.imperfect.find((e) => e.id === params.entryId);
    if (!entry) throw notFound();
    // Only the id and title travel with the route; content follows access rules.
    // ?? falls back only for null/undefined; ?. safely handles a missing card lookup.
    return { id: entry.id, title: entry.title ?? getCard(entry.id)?.title };
  },
  // head supplies document titles and metadata, not visible page content.
  head: ({ loaderData }) => {
    if (!loaderData)
      return { meta: [{ title: "Entry not found | Verb Wise" }, { name: "robots", content: "noindex" }] };
    const t = `${loaderData.title} — imperfect subjunctive | Verb Wise`;
    const d = `When to use the imperfect subjunctive with ${loaderData.title}: three triggers and nine examples.`;
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
  component: Detail,
});

function Detail() {
  const { id, title } = Route.useLoaderData();
  return <SubjunctiveDetailPage tense="imperfect" id={id} title={title} />;
}

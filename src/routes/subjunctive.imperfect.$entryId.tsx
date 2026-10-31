import { createFileRoute, notFound } from "@tanstack/react-router";
import { publicByTense } from "@/data/subjunctive-public";
import { getCard } from "@/data/cards";
import { SubjunctiveDetailPage } from "@/components/app/SubjunctiveDetailPage";

export const Route = createFileRoute("/subjunctive/imperfect/$entryId")({
  loader: ({ params }) => {
    const entry = publicByTense.imperfect.find((e) => e.id === params.entryId);
    if (!entry) throw notFound();
    // Only the id and title travel with the route; content follows access rules.
    return { id: entry.id, title: entry.title ?? getCard(entry.id)?.title };
  },
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

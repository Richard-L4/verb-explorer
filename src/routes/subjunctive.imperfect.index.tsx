/*
 * Imperfect catalogue at /subjunctive/imperfect: index is the directory landing page.
 * Passes a tense prop (a parent-to-child input) to SubjunctiveListPage, which uses
 * public data and the shared content-access.ts policy; this route defines page metadata.
 */
import { createFileRoute } from "@tanstack/react-router";
import { SubjunctiveListPage } from "@/components/app/SubjunctiveListPage";

// createFileRoute connects this filename to its URL in the generated route tree.
export const Route = createFileRoute("/subjunctive/imperfect/")({
  component: () => <SubjunctiveListPage tense="imperfect" />,
  // head supplies document titles and metadata, not visible page content.
  head: () => ({
    meta: [
      { title: "Spanish imperfect subjunctive by verb | Verb Wise" },
      { name: "description", content: "Learn the Spanish imperfect subjunctive: past wishes, doubts and 'si' clauses, with nine graded examples for every verb pair." },
      { property: "og:title", content: "Spanish imperfect subjunctive by verb | Verb Wise" },
      { property: "og:description", content: "Learn the Spanish imperfect subjunctive: past wishes, doubts and 'si' clauses, with nine graded examples for every verb pair." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

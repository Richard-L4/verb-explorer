/*
 * Present catalogue at /subjunctive/present: index is the directory landing page.
 * Passes a tense prop (a parent-to-child input) to SubjunctiveListPage, which uses
 * public data and the shared content-access.ts policy; this route defines page metadata.
 */
import { createFileRoute } from "@tanstack/react-router";
import { SubjunctiveListPage } from "@/components/app/SubjunctiveListPage";

// createFileRoute connects this filename to its URL in the generated route tree.
export const Route = createFileRoute("/subjunctive/present/")({
  component: () => <SubjunctiveListPage tense="present" />,
  // head supplies document titles and metadata, not visible page content.
  head: () => ({
    meta: [
      { title: "Spanish present subjunctive by verb | Verb Wise" },
      { name: "description", content: "Learn when Spanish needs the present subjunctive: three triggers and nine graded examples for every verb pair." },
      { property: "og:title", content: "Spanish present subjunctive by verb | Verb Wise" },
      { property: "og:description", content: "Learn when Spanish needs the present subjunctive: three triggers and nine graded examples for every verb pair." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

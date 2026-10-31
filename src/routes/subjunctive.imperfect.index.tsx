import { createFileRoute } from "@tanstack/react-router";
import { SubjunctiveListPage } from "@/components/app/SubjunctiveListPage";

export const Route = createFileRoute("/subjunctive/imperfect/")({
  component: () => <SubjunctiveListPage tense="imperfect" />,
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

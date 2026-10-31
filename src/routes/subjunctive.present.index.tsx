import { createFileRoute } from "@tanstack/react-router";
import { SubjunctiveListPage } from "@/components/app/SubjunctiveListPage";

export const Route = createFileRoute("/subjunctive/present/")({
  component: () => <SubjunctiveListPage tense="present" />,
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

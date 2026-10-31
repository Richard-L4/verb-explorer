import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { QuizPlayer } from "@/components/app/QuizPlayer";
import { isTense } from "@/data/subjunctive-tense";

export const Route = createFileRoute("/quiz")({
  validateSearch: (s: Record<string, unknown>): { tense?: "present" | "imperfect" } =>
    isTense(s.tense) ? { tense: s.tense } : {},
  component: Quiz,
  head: () => ({
    meta: [
      { title: "Spanish Verb & Subjunctive Quiz | Verb Wise" },
      {
        name: "description",
        content: "Test yourself on Spanish verb contrasts and the present and imperfect subjunctive with multiple-choice questions at three levels.",
      },
      { property: "og:title", content: "Spanish Verb & Subjunctive Quiz | Verb Wise" },
      {
        property: "og:description",
        content: "Multiple-choice questions on verb contrasts and the present and imperfect subjunctive, with feedback on every answer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Quiz() {
  const { tense } = Route.useSearch();
  return (
    <PageTransition>
      <PageHeader
        eyebrow="Quiz"
        title="Test what you've learned"
        description="Pick Verbs, Subjunctive (present or imperfect) or Mix, choose a level, and answer one question at a time."
      />
      <QuizPlayer initialCategory={tense ? "subjunctive" : "verbs"} initialTense={tense ?? "present"} />
    </PageTransition>
  );
}

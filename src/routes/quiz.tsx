import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { QuizPlayer } from "@/components/app/QuizPlayer";

export const Route = createFileRoute("/quiz")({
  component: Quiz,
  head: () => ({
    meta: [
      { title: "Spanish Verb & Subjunctive Quiz | Verb Wise" },
      {
        name: "description",
        content: "Test yourself on Spanish verb contrasts and the subjunctive with multiple-choice questions at three levels.",
      },
      { property: "og:title", content: "Spanish Verb & Subjunctive Quiz | Verb Wise" },
      {
        property: "og:description",
        content: "Multiple-choice questions on verb contrasts and the subjunctive, with feedback on every answer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Quiz() {
  return (
    <PageTransition>
      <PageHeader
        eyebrow="Quiz"
        title="Test what you've learned"
        description="Pick Verbs, Subjunctive or Mix, choose a level, and answer one question at a time."
      />
      <QuizPlayer />
    </PageTransition>
  );
}

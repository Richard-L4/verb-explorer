import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, GraduationCap, Heart, Brain } from "lucide-react";
import { useLearner } from "@/hooks/use-learner";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { ProgressBar } from "@/components/app/ProgressBar";

export const Route = createFileRoute("/statistics")({
  component: Statistics,
  head: () => ({
    meta: [
      { title: "Your learning statistics | Verbo" },
      { name: "description", content: "See how many Spanish verb cards you've studied, learned and favourited, plus progress across the deck." },
      { property: "og:title", content: "Your learning statistics | Verbo" },
      { property: "og:description", content: "Cards studied, cards learned, favourites and deck progress at a glance." },
    ],
  }),
});

function Statistics() {
  const { studiedCount, learnedCount, state, totalCards, progressPercent, studiedPercent } = useLearner();

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Statistics"
        title="Your learning at a glance"
        description="Live figures come from the progress saved in your browser. Deeper analytics arrive with quiz mode."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Cards studied" value={studiedCount} hint={`of ${totalCards} cards`} />
        <StatCard icon={GraduationCap} label="Cards learned" value={learnedCount} hint={`of ${totalCards} cards`} />
        <StatCard icon={Heart} label="Favourites" value={state.favourites.length} />
        <StatCard icon={Brain} label="Quiz accuracy" value="—" hint="Available with quiz mode" />
      </div>

      <section className="surface-card mt-6 space-y-6 p-6">
        <h2 className="text-xl font-semibold">Progress</h2>
        <ProgressBar value={studiedPercent} label="Cards opened" />
        <ProgressBar value={progressPercent} label="Cards marked as learned" />
      </section>

      <section className="surface-card mt-6 p-6">
        <h2 className="text-xl font-semibold">Quiz performance</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Once quiz mode ships, this space will show attempts, accuracy per card and your weakest verb pairs.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {["Attempts", "Correct answers", "Weakest card"].map((label) => (
            <div key={label} className="rounded-xl border border-dashed border-border p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-muted-foreground">—</p>
            </div>
          ))}
        </div>
      </section>
    </PageTransition>
  );
}

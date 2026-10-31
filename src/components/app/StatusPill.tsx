/** Small progress badge used by card tiles. The tone prop selects a label and appearance; this component displays status rather than changing learner records. */
import { cn } from "@/lib/utils";

type Tone = "learned" | "studied" | "new";

const styles: Record<Tone, string> = {
  learned: "bg-success/12 text-success border-success/30",
  studied: "bg-accent/12 text-accent border-accent/30",
  new: "bg-secondary/60 text-muted-foreground border-border/80",
};

const labels: Record<Tone, string> = { learned: "Learned", studied: "In progress", new: "Not started" };

export function StatusPill({ tone }: { tone: Tone }) {
  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em]", styles[tone])}>
      {labels[tone]}
    </span>
  );
}

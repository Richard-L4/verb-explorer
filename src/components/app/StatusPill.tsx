import { cn } from "@/lib/utils";

type Tone = "learned" | "studied" | "new";

const styles: Record<Tone, string> = {
  learned: "bg-success/12 text-success border-success/25",
  studied: "bg-accent/25 text-accent-foreground border-accent/40",
  new: "bg-secondary text-secondary-foreground border-border",
};

const labels: Record<Tone, string> = { learned: "Learned", studied: "In progress", new: "Not started" };

export function StatusPill({ tone }: { tone: Tone }) {
  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide", styles[tone])}>
      {labels[tone]}
    </span>
  );
}

import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="surface-card hairline-top group relative overflow-hidden p-5 transition-[border-color,box-shadow] duration-300 hover:border-primary/35 hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-center gap-2.5 text-muted-foreground">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-secondary/60 text-primary transition-colors duration-300 group-hover:border-primary/40">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-4 font-display text-4xl font-bold tabular-nums leading-none">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

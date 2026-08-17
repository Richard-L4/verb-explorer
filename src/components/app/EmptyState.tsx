import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface-card hairline-top relative flex flex-col items-center gap-4 overflow-hidden px-6 py-16 text-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 size-64 rounded-full bg-primary/10 blur-3xl"
      />
      <span className="gradient-soft relative flex size-14 items-center justify-center rounded-2xl border border-border text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div className="relative">
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

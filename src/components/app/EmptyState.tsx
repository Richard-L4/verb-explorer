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
    <div className="surface-card flex flex-col items-center gap-4 px-6 py-14 text-center">
      <span className="gradient-soft flex size-14 items-center justify-center rounded-2xl border border-border text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

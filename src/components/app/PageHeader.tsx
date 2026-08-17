import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 text-base text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

import { motion } from "framer-motion";

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div>
      {label ? (
        <div className="mb-2.5 flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="min-w-0 truncate font-medium">{label}</span>
          <span className="shrink-0 font-display text-base font-bold tabular-nums text-accent">{value}%</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-2.5 w-full overflow-hidden rounded-full border border-border/60 bg-secondary/70"
      >
        <motion.div
          className="gradient-hero h-full rounded-full shadow-[0_0_18px_-2px_var(--color-primary)]"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export function LearnedButton({
  active,
  onToggle,
  label,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      aria-pressed={active}
      aria-label={active ? `Mark ${label} as not learned` : `Mark ${label} as learned`}
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
        active
          ? "border-success/30 bg-success/12 text-success"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {active ? <Check className="size-4" aria-hidden="true" /> : <Circle className="size-4" aria-hidden="true" />}
      {active ? "Learned" : "Mark as learned"}
    </motion.button>
  );
}

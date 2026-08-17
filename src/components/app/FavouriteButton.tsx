import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function FavouriteButton({
  active,
  onToggle,
  label,
  withText,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
  withText?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.88 }}
      aria-pressed={active}
      aria-label={active ? `Remove ${label} from favourites` : `Add ${label} to favourites`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors",
        withText ? "" : "size-11 justify-center px-0",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      <motion.span animate={active ? { scale: [1, 1.3, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
        <Heart className={cn("size-4", active && "fill-current")} aria-hidden="true" />
      </motion.span>
      {withText ? <span>{active ? "Favourited" : "Favourite"}</span> : null}
    </motion.button>
  );
}

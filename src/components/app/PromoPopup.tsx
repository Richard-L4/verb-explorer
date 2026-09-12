import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ENTERED_KEY = "vw_has_entered_app_v1";
const SHOW_DELAY_MS = 3000;

function getHasEnteredApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ENTERED_KEY) === "1";
  } catch {
    return false;
  }
}

function markHasEnteredApp(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ENTERED_KEY, "1");
  } catch {
    // Ignore storage errors.
  }
}

export function PromoPopup() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);

  const isLanding = pathname === "/";

  // Any existing navigation away from the landing page counts as entering the app.
  useEffect(() => {
    if (!isLanding) {
      markHasEnteredApp();
    }
  }, [isLanding]);

  useEffect(() => {
    if (!isLanding || getHasEnteredApp()) return;

    const showTimer = window.setTimeout(() => {
      if (!getHasEnteredApp()) {
        setVisible(true);
      }
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(showTimer);
  }, [isLanding, pathname]);

  const close = () => setVisible(false);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Special offer"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative w-full max-w-sm rounded-3xl bg-white p-6 text-foreground shadow-2xl",
              "border border-black/5"
            )}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close offer"
              className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full text-black/40 transition-colors hover:bg-black/5 hover:text-black/70"
            >
              <X className="size-4" aria-hidden="true" />
            </button>

            <div className="pt-2">
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                Limited time
              </span>

              <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-black">
                7 Days Free Trial
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-black/70">
                Try full access to Verb Wise for 7 days.
              </p>

              <p className="mt-2 text-sm leading-relaxed text-black/80">
                Then{" "}
                <span className="font-bold text-black">£4.99</span> for{" "}
                <span className="font-bold text-black">unlimited lifetime access</span>.
              </p>

              <p className="mt-4 text-xs text-black/50">
                No subscription. No recurring charges.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

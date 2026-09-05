import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, X } from "lucide-react";
import {
  getDeferredPrompt,
  isIos,
  isMac,
  isReminderDone,
  isStandalone,
  markReminderDone,
  subscribeInstallPrompt,
  triggerInstallPrompt,
} from "@/lib/install-prompt";

type Variant = "android" | "ios" | "desktop";

function qualifyingRoute(pathname: string) {
  return pathname.startsWith("/card/") || pathname === "/sayings";
}

export function InstallBanner() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const eligible = qualifyingRoute(pathname);
  const [visible, setVisible] = useState(false);
  const [variant, setVariant] = useState<Variant>("desktop");
  const [promptTick, setPromptTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeInstallPrompt(() => setPromptTick((t) => t + 1));
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!eligible || visible) return;
    if (isStandalone() || isReminderDone()) return;

    const next: Variant = getDeferredPrompt() ? "android" : isIos() ? "ios" : "desktop";
    setVariant(next);
    setVisible(true);
    // Only consume the one-time reminder once it is actually on screen.
    markReminderDone();
  }, [eligible, visible, promptTick]);

  const close = () => setVisible(false);

  const install = async () => {
    await triggerInstallPrompt();
    setVisible(false);
  };

  const message =
    variant === "android"
      ? "Add Verb Wise to your home screen for instant access."
      : variant === "ios"
        ? "Add Verb Wise to your home screen: tap the share button, then choose 'Add to Home Screen'."
        : `Bookmark Verb Wise for instant access — ${isMac() ? "Cmd+D" : "Ctrl+D"}.`;

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="overflow-hidden border-t border-primary/30 bg-primary/15 backdrop-blur-xl"
          role="region"
          aria-label="Add to home screen"
        >
          <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-3 sm:items-center sm:px-6">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-primary/40 bg-primary/20 text-primary sm:mt-0">
              {variant === "ios" ? (
                <Share className="size-4" aria-hidden="true" />
              ) : (
                <Download className="size-4" aria-hidden="true" />
              )}
            </span>
            <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground">{message}</p>
            {variant === "android" && (
              <button
                type="button"
                onClick={install}
                className="min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                Add to Home Screen
              </button>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Dismiss add to home screen message"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card/70 text-foreground transition-colors hover:bg-secondary"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

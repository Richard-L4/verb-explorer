import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Download, Share, Sparkles, X } from "lucide-react";
import {
  getDeferredPrompt,
  isIos,
  isMac,
  isStandalone,
  subscribeInstallPrompt,
  triggerInstallPrompt,
} from "@/lib/install-prompt";
import {
  INSTALL_STEP_KEY,
  REMINDER_INVITE_KEY,
  dismissPostStudyPanel,
  installCtaPending,
  markMovedAwayFromHome,
  movedAwayFromHome,
  postStudyPending,
  readFlag,
  reminderInvitePending,
  studiedCount,
  subscribeRandom,
  writeFlag,
} from "@/lib/random-session";
import { enableReminders, permissionState, pushSupported } from "@/lib/push-client";

type Stage = "install" | "reminders" | "done";
type InstallMode = "prompt" | "ios" | "desktop" | "installed";

/**
 * Shown at the very top of whichever page the user lands on after leaving
 * Random Cards. Install first, reminders only afterwards — never on arrival.
 */
export function PostStudyPanel() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const [stage, setStage] = useState<Stage>("install");
  const [mode, setMode] = useState<InstallMode>("desktop");
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsubscribePrompt = subscribeInstallPrompt(() => setTick((t) => t + 1));
    const unsubscribeRandom = subscribeRandom(() => setTick((t) => t + 1));
    return () => {
      unsubscribePrompt();
      unsubscribeRandom();
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/" && pathname !== "/random") markMovedAwayFromHome();

    if (pathname === "/random") {
      setVisible(false);
      return;
    }

    const installed = isStandalone();

    // Installed: the reminder invitation is available immediately, anywhere.
    if (installed) {
      if (reminderInvitePending() && canOfferReminders()) {
        setMode("installed");
        setCount(studiedCount());
        setStage("reminders");
        setVisible(true);
        return;
      }
      setVisible(false);
      return;
    }

    // Not installed: offer the install step once the user is off the Home page,
    // or straight away after a Random Cards session.
    const showInstall = installCtaPending() && (movedAwayFromHome() || postStudyPending());
    if (!showInstall) {
      setVisible(false);
      return;
    }

    setMode(getDeferredPrompt() ? "prompt" : isIos() ? "ios" : "desktop");
    setCount(studiedCount());
    setStage("install");
    setVisible(true);
  }, [pathname, tick]);

  const close = () => {
    dismissPostStudyPanel();
    setVisible(false);
  };

  function canOfferReminders(): boolean {
    if (!pushSupported()) return false;
    if (readFlag(REMINDER_INVITE_KEY)) return false;
    return permissionState() === "default";
  }

  const afterInstallStep = () => {
    writeFlag(INSTALL_STEP_KEY, "done");
    if (canOfferReminders()) setStage("reminders");
    else close();
  };

  const install = async () => {
    const outcome = await triggerInstallPrompt();
    if (outcome === "accepted") {
      afterInstallStep();
      return;
    }
    // Dismissed or unavailable: never ask again from this panel.
    writeFlag(INSTALL_STEP_KEY, "dismissed");
    close();
  };

  const allowReminders = async () => {
    const outcome = await enableReminders();
    if (outcome === "on") {
      writeFlag(REMINDER_INVITE_KEY, "granted");
      setReminderNote("Done — you'll get a short Spanish reminder each day.");
      setStage("done");
      return;
    }
    writeFlag(REMINDER_INVITE_KEY, outcome === "denied" ? "denied" : "unavailable");
    close();
  };

  const notNow = () => {
    writeFlag(REMINDER_INVITE_KEY, "declined");
    close();
  };

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.section
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          aria-label="Keep your Spanish going"
          className="surface-card gradient-soft hairline-top relative mb-6 overflow-hidden p-6 sm:p-7"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Dismiss this message"
            className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-full border border-border bg-card/70 text-foreground transition-colors hover:bg-secondary"
          >
            <X className="size-5" aria-hidden="true" />
          </button>

          {stage === "install" ? (
            <>
              {count > 0 ? (
                <>
                  <p className="pr-12 font-display text-2xl font-bold leading-tight sm:text-3xl">
                    <span className="gradient-text">
                      Great! You&apos;ve studied {count} card{count === 1 ? "" : "s"}. 🇪🇸
                    </span>
                  </p>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Be sure to come back soon and keep your Spanish going.
                  </p>
                </>
              ) : null}

              <h2 className={`${count > 0 ? "mt-6" : "pr-12"} font-display text-xl font-bold tracking-tight`}>
                <span className="gradient-text">Add Verb Wise to your Home Screen</span>
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Keep Verb Wise just a tap away so you can practise whenever you have a few minutes.
              </p>

              {mode === "ios" ? (
                <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-5 py-3 text-sm font-bold text-foreground">
                  <Share className="size-4 text-primary" aria-hidden="true" />
                  Tap Share, then choose &ldquo;Add to Home Screen&rdquo;
                </p>
              ) : mode === "prompt" ? (
                <button
                  type="button"
                  onClick={install}
                  className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Download className="size-4" aria-hidden="true" /> Add Verb Wise to your Home Screen
                </button>
              ) : mode === "installed" ? (
                <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-5 py-3 text-sm font-bold text-foreground">
                  <Check className="size-4 text-primary" aria-hidden="true" /> Already on your home screen
                </p>
              ) : (
                <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-5 py-3 text-sm font-bold text-foreground">
                  <Sparkles className="size-4 text-primary" aria-hidden="true" />
                  Bookmark Verb Wise for instant access — {isMac() ? "Cmd+D" : "Ctrl+D"}
                </p>
              )}

              {mode !== "prompt" ? (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={afterInstallStep}
                    className="min-h-11 rounded-full border border-border bg-card/70 px-5 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-secondary"
                  >
                    Done
                  </button>
                </div>
              ) : null}
            </>
          ) : stage === "reminders" ? (
            <>
              <h2 className="pr-12 font-display text-xl font-bold tracking-tight sm:text-2xl">
                <span className="gradient-text">
                  Want a little reminder to keep your Spanish going? 🇪🇸
                </span>
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Allow daily reminders and Verb Wise can remind you to practise each day.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={allowReminders}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Check className="size-4" aria-hidden="true" /> Allow daily reminders
                </button>
                <button
                  type="button"
                  onClick={notNow}
                  className="inline-flex min-h-12 items-center rounded-full border border-border bg-card/70 px-6 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-secondary"
                >
                  Not now
                </button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                You can turn these off any time in Settings.
              </p>
            </>
          ) : (
            <p className="flex items-center gap-2 pr-12 text-sm font-semibold text-foreground">
              <Bell className="size-4 text-primary" aria-hidden="true" />
              {reminderNote}
            </p>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  );
}

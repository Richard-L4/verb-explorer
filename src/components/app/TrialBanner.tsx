import { Link } from "@tanstack/react-router";
import { useAccess } from "@/hooks/use-access";

/**
 * Subtle, single-line trial countdown banner shown under the header.
 * Renders only when:
 *  - creator mode is off, and
 *  - the user has not purchased, and
 *  - either the trial is active with 7/3/2/1 days left, or the trial has expired.
 * Returns null otherwise.
 */
function reminderFor(daysLeft: number, trialActive: boolean): string | null {
  if (!trialActive) return "Your full-access trial has ended.";
  if (daysLeft === 7) return "7 days left in your full-access trial.";
  if (daysLeft === 3) return "3 days left in your full-access trial.";
  if (daysLeft === 2) return "2 days left in your full-access trial.";
  if (daysLeft === 1) return "Your full-access trial ends tomorrow.";
  return null;
}

export function TrialBanner() {
  const { creator, unlocked, inTrial, trialDaysLeft, price, bannerPreview } = useAccess();

  let message: string | null = null;
  const isPreview = bannerPreview !== null;

  // A real purchase always hides the countdown, even while a creator preview is active.
  if (unlocked) return null;

  if (isPreview) {
    message =
      bannerPreview === "expired"
        ? reminderFor(0, false)
        : reminderFor(bannerPreview as number, true);
  } else {
    if (creator) return null;
    if (inTrial && ![7, 3, 2, 1].includes(trialDaysLeft)) return null;
    message = reminderFor(trialDaysLeft, inTrial);
  }
  if (!message) return null;

  return (
    <div className="mx-auto mb-8 w-full max-w-6xl sm:mb-12">
      <div className="surface-card flex flex-col items-start justify-between gap-3 border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <p className="text-sm font-semibold text-foreground sm:text-base">
          {isPreview ? (
            <span className="mr-2 rounded-full border border-border bg-background/40 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Preview
            </span>
          ) : null}
          {message}
        </p>
        <Link
          to="/unlock"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          Buy now — {price}
        </Link>
      </div>
    </div>
  );
}

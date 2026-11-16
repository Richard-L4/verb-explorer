/**
 * Browser side of the server-authoritative trial.
 *
 * Called once from access.hydrate(). It asks the server whether this visitor
 * is entitled to a trial, adopts the server's start date when it is older than
 * the local one (so clearing storage cannot restart the clock), and logs
 * `trial_started` only when the server accepted a genuinely first trial.
 */
import { logEvent, markServerSessionReady } from "./analytics";
import { applyServerTrialStart, setTrialCheck, TRIAL_DAYS } from "./access";
import { collectDeviceSignal } from "./device-signal";

export async function syncServerTrial(_firstVisit: boolean): Promise<void> {
  if (typeof window === "undefined") return;
  // Only Lovable Preview hosts skip the claim (they share the production
  // database). A local creator/test flag never skips verification; analytics
  // stay suppressed for test devices inside logEvent.
  const { isLovablePreviewHost } = await import("./preview");
  if (isLovablePreviewHost()) {
    setTrialCheck("failed");
    return;
  }

  try {
    const { claimTrialSession } = await import("./trial.functions");
    const device = collectDeviceSignal();
    const claim = await claimTrialSession({ data: { device } });

    if (!claim.available) {
      markServerSessionReady();
      // Server or table unavailable — fail safe: no unverified trial is shown.
      setTrialCheck("failed");
      return;
    }

    markServerSessionReady();
    if (claim.trialStart) applyServerTrialStart(claim.trialStart);
    setTrialCheck(claim.trialStart ? "verified" : "failed");
    if (claim.isNew) void logEvent("trial_started", { trialDay: TRIAL_DAYS });
  } catch {
    markServerSessionReady();
    setTrialCheck("failed");
  }
}

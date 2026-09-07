/**
 * Browser side of the server-authoritative trial.
 *
 * Called once from access.hydrate(). It asks the server whether this visitor
 * is entitled to a trial, adopts the server's start date when it is older than
 * the local one (so clearing storage cannot restart the clock), and logs
 * `trial_started` only when the server accepted a genuinely first trial.
 */
import { isTestDevice, logEvent } from "./analytics";
import { applyServerTrialStart, TRIAL_DAYS } from "./access";
import { collectDeviceSignal } from "./device-signal";

export async function syncServerTrial(firstVisit: boolean): Promise<void> {
  if (typeof window === "undefined") return;
  // Creator / test devices never touch server entitlement or analytics.
  if (isTestDevice()) return;

  try {
    const { claimTrialSession } = await import("./trial.functions");
    const device = collectDeviceSignal();
    const claim = await claimTrialSession({ data: { device } });

    if (!claim.available) {
      // Server or table unavailable — preserve the previous local behaviour.
      if (firstVisit) void logEvent("trial_started", { trialDay: TRIAL_DAYS });
      return;
    }

    if (claim.trialStart) applyServerTrialStart(claim.trialStart);
    if (claim.isNew) void logEvent("trial_started", { trialDay: TRIAL_DAYS });
  } catch {
    if (firstVisit) void logEvent("trial_started", { trialDay: TRIAL_DAYS });
  }
}

/**
 * Server-function endpoint for browser trial claims, backed by Supabase trial_grants.
 * The handler runs only on the server; the browser receives a result and an HttpOnly identity cookie.
 * A server function accepts a request, not a trusted browser entitlement.
 */
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { parseTrialInput } from "./trial-input";

/**
 * Resolves (and, on a genuine first visit, creates) this visitor's trial
 * entitlement. The server owns the identity: an opaque HttpOnly cookie, a
 * salted one-way device hash and a salted one-way network hash. Test/creator
 * devices are ignored entirely.
 */
export const claimTrialSession = createServerFn({ method: "POST" })
  // Keep validation in trial-input.ts: reject unknown keys before parsing the eight device strings.
  // This bounds validation work as well as preserving the collector contract.
  .inputValidator(parseTrialInput)
  // data has passed parseTrialInput; async/await lets database work finish before replying.
  .handler(async ({ data }) => {
    if (data.testDevice === true) {
      return { available: false, trialStart: null, isNew: false, repeat: false };
    }

    const { claimTrial, TRIAL_COOKIE, TRIAL_COOKIE_MAX_AGE } = await import("./trial.server");

    const existing = getCookie(TRIAL_COOKIE) ?? null;
    const { trustedRequestAddress } = await import("./client-address.server");
    const address = await trustedRequestAddress();

    const result = await claimTrial({ token: existing, address, device: data.device ?? null });

    if (result.issueToken) {
      setCookie(TRIAL_COOKIE, result.issueToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: TRIAL_COOKIE_MAX_AGE,
      });
    }

    return result.claim;
  });

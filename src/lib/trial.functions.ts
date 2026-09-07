import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

/**
 * Resolves (and, on a genuine first visit, creates) this visitor's trial
 * entitlement. The server owns the identity: an opaque HttpOnly cookie plus a
 * salted one-way network hash. Test/creator devices are ignored entirely.
 */
export const claimTrialSession = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ testDevice: z.boolean().optional() }).parse(input))
  .handler(async ({ data }) => {
    if (data.testDevice === true) {
      return { available: false, trialStart: null, isNew: false, repeat: false };
    }

    const { claimTrial, TRIAL_COOKIE, TRIAL_COOKIE_MAX_AGE } = await import("./trial.server");

    const existing = getCookie(TRIAL_COOKIE) ?? null;
    let address: string | null = null;
    try {
      address = getRequestIP({ xForwardedFor: true }) ?? null;
    } catch {
      address = null;
    }

    const result = await claimTrial({ token: existing, address });

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

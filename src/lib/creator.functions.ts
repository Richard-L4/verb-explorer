/**
 * Server-function handlers for claiming and checking creator access from browser creator tools.
 * Run on the server; use Supabase attempt storage and server-only signing, never a client creator key.
 * A server function is a callable server endpoint; a URL parameter is input, not proof of access.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Validates a ?creator= value against the server-only CREATOR_ACCESS_KEY.
 * The value is never logged, echoed or stored. Rate-limited per network.
 */
export const claimCreator = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ value: z.string().min(1).max(256) }).parse(input))
  // The validator above parses untrusted input first; only its result reaches data.
  // async returns a Promise; await waits for server work without blocking other requests.
  .handler(async ({ data }) => {
    const { readEnv } = await import("./env.server");
    const { safeEqual, signPass, creatorFingerprint } = await import("./content-pass.server");
    const configured = readEnv("CREATOR_ACCESS_KEY");
    const secret = readEnv("CONTENT_PASS_SECRET");
    if (!configured || !secret) return { pass: null };
    // A rate limit caps guesses per time window; try/catch denies access if its storage fails.
    try {
      const { creatorAttemptAllowed, supabaseCodeStore } = await import("./restore.server");
      const { requestAddress } = await import("./content-checks.server");
      if (!(await creatorAttemptAllowed(await supabaseCodeStore(), secret, await requestAddress()))) {
        return { pass: null };
      }
    } catch {
      // Rate-limit storage unavailable: fail closed.
      return { pass: null };
    }
    if (!(await safeEqual(data.value, configured))) return { pass: null };
    return { pass: await signPass("creator", await creatorFingerprint(configured)) };
  });

/** Confirms a stored pass is a creator pass (used to switch on creator tools). */
export const checkCreatorPass = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ pass: z.string().max(2048) }).parse(input))
  .handler(async ({ data }) => {
    const { passRole } = await import("./content-pass.server");
    const { buildChecks } = await import("./content-checks.server");
    try {
      return { creator: (await passRole(data.pass, await buildChecks())) === "creator" };
    } catch {
      return { creator: false };
    }
  });

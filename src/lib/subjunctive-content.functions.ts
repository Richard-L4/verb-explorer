/**
 * Server-function endpoints called by use-subjunctive for protected tense datasets.
 * Handlers run on the server and re-check Supabase entitlements before loading private JSON.
 * The browser calls endpoint proxies, not the server-only data modules.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Returns the full present and imperfect subjunctive datasets only for a valid, unexpired signed pass
 * whose entitlement (purchase or creator) the server re-confirms.
 */
export const getProtectedSubjunctive = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ pass: z.string().max(2048) }).parse(input))
  // The validator above parses untrusted input first; only its result reaches data.
  // async returns a Promise; await waits for server work without blocking other requests.
  .handler(async ({ data }) => {
    const { passRole } = await import("./content-pass.server");
    const { buildChecks } = await import("./content-checks.server");
    let role: Awaited<ReturnType<typeof passRole>> = null;
    // If checking fails, leave role empty: try/catch must not turn an outage into paid access.
    try {
      role = await passRole(data.pass, await buildChecks());
    } catch {
      console.error("[subjunctive] pass check failed");
    }
    if (!role) return { paid: false as const, role: null, entries: null, imperfect: null };
    const { fullSubjunctive } = await import("./subjunctive-full.server");
    const { fullImperfectSubjunctive } = await import("./imperfect-subjunctive-full.server");
    return { paid: true as const, role, entries: fullSubjunctive, imperfect: fullImperfectSubjunctive };
  });

/**
 * Issues a pass without user input only where the server itself can verify
 * entitlement: a request served from a Lovable Preview host. No browser-supplied
 * identifier is ever accepted as proof of purchase.
 */
export const requestAutomaticPass = createServerFn({ method: "POST" }).handler(async () => {
  const { signPass } = await import("./content-pass.server");
  const { buildChecks } = await import("./content-checks.server");
  const c = await buildChecks();
  if (c.isPreviewRequest()) return { pass: await signPass("preview", "preview") };
  return { pass: null };
});

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Returns the full subjunctive dataset only for a valid, unexpired signed pass
 * whose entitlement (purchase or creator) the server re-confirms.
 */
export const getProtectedSubjunctive = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ pass: z.string().max(2048) }).parse(input))
  .handler(async ({ data }) => {
    const { passRole } = await import("./content-pass.server");
    const { buildChecks } = await import("./content-checks.server");
    let role: Awaited<ReturnType<typeof passRole>> = null;
    try {
      role = await passRole(data.pass, await buildChecks());
    } catch {
      console.error("[subjunctive] pass check failed");
    }
    if (!role) return { paid: false as const, role: null, entries: null };
    const { fullSubjunctive } = await import("./subjunctive-full.server");
    return { paid: true as const, role, entries: fullSubjunctive };
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

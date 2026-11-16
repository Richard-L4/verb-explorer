/**
 * Server-function endpoints called by use-subjunctive for protected tense datasets.
 * Handlers run on the server and re-check Supabase entitlements before loading private JSON.
 * The browser calls endpoint proxies, not the server-only data modules.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Returns the complete content (verb deck, present and imperfect subjunctive, sayings)
 * only for a valid signed pass whose entitlement (purchase or creator) the server
 * re-confirms, or for an active trial proven by the server's own HttpOnly trial cookie.
 * Everyone else gets `paid: false` and keeps the public SER vs ESTAR collection.
 * `accessUntil` tells the browser when to drop trial content from memory.
 */
export const getProtectedSubjunctive = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ pass: z.string().max(2048).nullable().optional() }).parse(input ?? {}))
  // The validator above parses untrusted input first; only its result reaches data.
  .handler(async ({ data }) => {
    const { passRole } = await import("./content-pass.server");
    const { buildChecks } = await import("./content-checks.server");
    const { resolveEntitlement } = await import("./entitlement.server");
    const { liveQuizDeps } = await import("./quiz.server");
    const deps = await liveQuizDeps();
    const ent = await resolveEntitlement(data.pass ?? null, {
      passRole: async (p) => passRole(p, await buildChecks()),
      trialStart: deps.trialStart,
      trialDays: deps.trialDays,
    });
    if (!ent.full) return { paid: false as const, role: null, accessUntil: null, entries: null, imperfect: null, verbs: null, sayings: null };
    const { fullSubjunctive } = await import("./subjunctive-full.server");
    const { fullImperfectSubjunctive } = await import("./imperfect-subjunctive-full.server");
    const { fullVerbs } = await import("./verbs-full.server");
    const { fullSayings } = await import("./sayings-full.server");
    return {
      paid: true as const,
      role: ent.role,
      accessUntil: ent.accessUntil,
      entries: fullSubjunctive,
      imperfect: fullImperfectSubjunctive,
      verbs: fullVerbs,
      sayings: fullSayings,
    };
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

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function checks() {
  const { purchaseExists, purchaseExistsForEmail, paymentIntentPurchased } = await import(
    "./payments.server"
  );
  const { getRequest } = await import("@tanstack/react-start/server");
  const { isLovablePreviewHost } = await import("./preview");
  return {
    sessionPaid: purchaseExists,
    emailPaid: purchaseExistsForEmail,
    paymentIntentPaid: paymentIntentPurchased,
    isPreviewRequest: () => isLovablePreviewHost(new URL(getRequest().url).hostname),
  };
}

/**
 * Returns the full subjunctive dataset only for a valid signed pass whose
 * purchase still exists. Anything else gets { paid: false } and no content.
 */
export const getProtectedSubjunctive = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ pass: z.string().max(2048) }).parse(input))
  .handler(async ({ data }) => {
    const { passGrantsAccess } = await import("./content-pass.server");
    let ok = false;
    try {
      ok = await passGrantsAccess(data.pass, await checks());
    } catch (error) {
      console.error("[subjunctive] pass check failed:", error instanceof Error ? error.message : error);
    }
    if (!ok) return { paid: false as const, entries: null };
    const { fullSubjunctive } = await import("./subjunctive-full.server");
    return { paid: true as const, entries: fullSubjunctive };
  });

/**
 * Issues a pass without user input where the server can verify entitlement:
 * Lovable Preview (existing creator mode), or an earlier purchase linked to
 * this browser's anonymous device id in Stripe.
 */
export const requestAutomaticPass = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ deviceId: z.string().min(8).max(128).nullable() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { signPass } = await import("./content-pass.server");
    const c = await checks();
    if (c.isPreviewRequest()) return { pass: await signPass("preview", "preview") };
    if (data.deviceId) {
      const { findPurchaseForDevice } = await import("./payments.server");
      const pi = await findPurchaseForDevice(data.deviceId);
      if (pi) return { pass: await signPass("pi", pi) };
    }
    return { pass: null };
  });

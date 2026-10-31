/**
 * Builds server-only entitlement checks for content and creator server functions.
 * Uses Supabase purchase helpers and request context; browser hooks call those functions.
 */
/** Server-only: real entitlement checks used by every protected endpoint. */
import type { EntitlementChecks } from "./content-pass.server";

export async function buildChecks(): Promise<EntitlementChecks> {
  const { purchaseExists, purchaseExistsForEmail } = await import("./payments.server");
  const { getRequest } = await import("@tanstack/react-start/server");
  const { isLovablePreviewHost } = await import("./preview");
  const { readEnv } = await import("./env.server");
  const { creatorFingerprint } = await import("./content-pass.server");
  return {
    sessionPaid: purchaseExists,
    emailPaid: purchaseExistsForEmail,
    isPreviewRequest: () => isLovablePreviewHost(new URL(getRequest().url).hostname),
    creatorFingerprint: async () => {
      const k = readEnv("CREATOR_ACCESS_KEY");
      return k ? creatorFingerprint(k) : null;
    },
  };
}

export async function requestAddress(): Promise<string | null> {
  const { trustedRequestAddress } = await import("./client-address.server");
  return trustedRequestAddress();
}

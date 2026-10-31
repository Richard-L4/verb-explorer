/**
 * Server-only checkout claim flow called by checkout.functions.ts from the success page.
 * Uses injected Stripe verification and Supabase claim operations, not browser payment claims.
 */
/**
 * One-time claiming of a Stripe payment reference from the success page.
 *
 * The browser that starts checkout gets an HttpOnly random marker cookie; its
 * SHA-256 is stored in the Checkout Session metadata. On return, the first
 * browser presenting a matching marker claims the purchase atomically in the
 * database (`claim_purchase`). The same browser may retry for 30 minutes;
 * every other device restores by email. Copying the success URL never copies
 * the marker, because it lives only in an HttpOnly cookie.
 */

export const CLAIM_COOKIE = "vw_claim";
export const CLAIM_COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day: long enough to finish checkout
export const CLAIM_WINDOW_MINUTES = 30;

export function newClaimMarker(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function isClaimMarker(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

export async function markerHash(marker: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`vw-claim:v1:${marker}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export type ClaimOutcome = "granted" | "refused" | "error";

export interface ClaimDeps {
  /** Re-fetched, verified Verb Wise session (or null when not paid / not ours). */
  verifiedSession(sessionId: string): Promise<{ id: string; metadata?: Record<string, string> | null } | null>;
  purchaseExists(sessionId: string): Promise<boolean>;
  recordPurchase(session: unknown): Promise<void>;
  /** Atomic database claim; throws on database failure. */
  claim(sessionId: string, ownerHash: string, windowMinutes: number): Promise<boolean>;
  /** Rate limit checked after the marker and before any Stripe lookup; false = try later. */
  allowLookup?(ownerHash: string): Promise<boolean>;
}

export type ConfirmStatus = "done" | "restore" | "pending";

/**
 * Decides the success-page outcome. A purchase is consumed only by a
 * successful claim; database or Stripe failures return "pending" so the
 * same browser can retry, and Restore by email always remains available.
 */
export async function confirmAndClaim(
  deps: ClaimDeps,
  sessionId: string,
  marker: string | null | undefined,
): Promise<ConfirmStatus> {
  if (!isClaimMarker(marker)) return "restore";
  const ownerHash = await markerHash(marker);

  if (deps.allowLookup && !(await deps.allowLookup(ownerHash))) return "pending";

  // async/await waits for verification before claiming; try/catch keeps provider failures
  // retryable instead of treating an outage as either proof of payment or a final refusal.
  let session;
  try {
    session = await deps.verifiedSession(sessionId);
  } catch {
    return "pending";
  }
  if (!session) return "pending";

  // Bound to the browser that started checkout.
  const expected = session.metadata?.["claim_hash"];
  if (!expected || expected !== ownerHash) return "restore";

  try {
    if (!(await deps.purchaseExists(sessionId))) {
      await deps.recordPurchase(session);
      if (!(await deps.purchaseExists(sessionId))) return "pending";
    }
    // claim_purchase is atomic: the database checks and assigns ownership as one operation,
    // so two concurrent browsers cannot both win a separate check-then-write race.
    return (await deps.claim(sessionId, ownerHash, CLAIM_WINDOW_MINUTES)) ? "done" : "restore";
  } catch {
    return "pending";
  }
}

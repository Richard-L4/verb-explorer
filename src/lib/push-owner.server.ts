/**
 * Ownership proof for reminder subscriptions.
 *
 * Each browser that registers for reminders receives an HttpOnly cookie
 * holding an unguessable token bound to its delivery address. The token is
 * an HMAC of the address under a server-only secret, so nothing extra is
 * stored in the database and it can never be derived from the address alone.
 * The token never appears in URLs, responses or logs.
 *
 * Subscriptions created before this protection existed are still owned by
 * the browser that holds the matching private delivery keys (p256dh + auth),
 * which only that browser and our database know.
 */
import { hmacHex, safeEqual } from "./content-pass.server";
import { readEnv } from "./env.server";

/**
 * The dedicated reminder secret. Deliberately has NO fallback to the
 * purchase/creator pass secret: if missing, reminder writes fail closed.
 */
export function reminderSecret(): string | null {
  const s = readEnv("REMINDER_OWNER_SECRET");
  return s && s.length >= 32 ? s : null;
}

export const PUSH_OWNER_COOKIE = "vw_push_owner";
const LABEL = "push-owner:v1:";

export async function ownerToken(secret: string, endpoint: string): Promise<string> {
  return hmacHex(secret, `${LABEL}${endpoint}`);
}

export interface StoredSubscription {
  p256dh: string;
  auth: string;
}

export interface OwnershipClaim {
  endpoint: string;
  cookieToken: string | null | undefined;
  p256dh?: string;
  auth?: string;
}

/** True when the caller proves it owns the stored subscription. */
export async function provesOwnership(
  secret: string,
  stored: StoredSubscription,
  claim: OwnershipClaim,
): Promise<boolean> {
  if (claim.cookieToken) {
    const expected = await ownerToken(secret, claim.endpoint);
    if (await safeEqual(claim.cookieToken, expected, secret)) return true;
  }
  if (claim.p256dh && claim.auth) {
    const [a, b] = await Promise.all([
      safeEqual(claim.p256dh, stored.p256dh, secret),
      safeEqual(claim.auth, stored.auth, secret),
    ]);
    if (a && b) return true;
  }
  return false;
}

/** Decides whether a save may write. A brand-new address is always allowed. */
export async function maySave(
  secret: string,
  stored: StoredSubscription | null,
  claim: OwnershipClaim,
): Promise<boolean> {
  if (!stored) return true;
  return provesOwnership(secret, stored, claim);
}

/** Decides whether a cancellation may write. Unknown addresses do nothing. */
export async function mayCancel(
  secret: string,
  stored: StoredSubscription | null,
  claim: OwnershipClaim,
): Promise<boolean> {
  if (!stored) return false;
  return provesOwnership(secret, stored, claim);
}

/**
 * Server-side trial entitlement (server-only).
 *
 * The browser is no longer the authority for "has this visitor already had a
 * trial". The server issues an opaque, random, HttpOnly cookie and keeps the
 * entitlement in `public.trial_grants`.
 *
 * Privacy:
 *  - the cookie value is random and meaningless; nothing personal is in it,
 *  - only a SHA-256 of the cookie value is stored,
 *  - the network address is never stored: only a salted one-way SHA-256, used
 *    as a weak secondary signal and never sent to the browser.
 */

import { createHash, randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "./payments.server";
import { readEnv } from "./env.server";

export const TRIAL_COOKIE = "vw_vid";
export const TRIAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 3650; // ~10 years

/**
 * How many separate trials one network hash may start before further "new"
 * visitors inherit the existing trial clock instead of getting a fresh one.
 * Deliberately > 1 so households and small offices are not blocked.
 */
export const NETWORK_GRANT_ALLOWANCE = 2;

function salt(): string {
  return readEnv("TRIAL_HASH_SALT") ?? "verb-wise-fallback-salt";
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashToken(token: string): string {
  return sha256(`token:${salt()}:${token}`);
}

/** One-way, salted. The raw address is never stored or returned. */
export function hashNetwork(address: string | null | undefined): string | null {
  const trimmed = (address ?? "").trim();
  if (!trimmed) return null;
  return sha256(`net:${salt()}:${trimmed}`);
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export interface TrialClaim {
  /** False when the table/credentials are unavailable — caller falls back. */
  available: boolean;
  /** Authoritative trial start for this visitor, ISO string. */
  trialStart: string | null;
  /** True only when the server granted a genuinely first trial. */
  isNew: boolean;
  /** True when this looked like a repeat attempt and inherited a clock. */
  repeat: boolean;
}

export interface ClaimResult {
  claim: TrialClaim;
  /** Set when a new cookie must be written on the response. */
  issueToken?: string;
}

const UNAVAILABLE: ClaimResult = {
  claim: { available: false, trialStart: null, isNew: false, repeat: false },
};

interface GrantRow {
  token_hash: string;
  network_hash: string | null;
  trial_started_at: string;
  repeat_suspected: boolean;
}

/**
 * Resolves the visitor's trial entitlement, creating one on a genuine first
 * visit. Never throws: any failure degrades to `available: false`.
 */
export async function claimTrial(input: {
  token: string | null;
  address: string | null;
}): Promise<ClaimResult> {
  try {
    const db = getSupabaseAdmin();

    // 1. Primary identity: the server-issued cookie.
    if (input.token) {
      const { data, error } = await db
        .from("trial_grants")
        .select("token_hash, network_hash, trial_started_at, repeat_suspected")
        .eq("token_hash", hashToken(input.token))
        .maybeSingle();
      if (error) return UNAVAILABLE;
      if (data) {
        const row = data as GrantRow;
        return {
          claim: {
            available: true,
            trialStart: row.trial_started_at,
            isNew: false,
            repeat: row.repeat_suspected,
          },
        };
      }
    }

    // 2. No known cookie — this is a candidate first trial.
    const networkHash = hashNetwork(input.address);
    let trialStartedAt = new Date().toISOString();
    let repeat = false;

    if (networkHash) {
      const { data, error } = await db
        .from("trial_grants")
        .select("trial_started_at")
        .eq("network_hash", networkHash)
        .order("trial_started_at", { ascending: true });
      if (error) return UNAVAILABLE;
      const rows = (data ?? []) as { trial_started_at: string }[];
      if (rows.length >= NETWORK_GRANT_ALLOWANCE) {
        // Secondary signal only: access is NOT blocked. The visitor simply
        // inherits the oldest trial clock on this network rather than
        // restarting it, so deleting the cookie buys no extra days.
        trialStartedAt = rows[0]!.trial_started_at;
        repeat = true;
      }
    }

    const token = newToken();
    const { error: insertError } = await db.from("trial_grants").insert({
      token_hash: hashToken(token),
      network_hash: networkHash,
      trial_started_at: trialStartedAt,
      repeat_suspected: repeat,
    });
    if (insertError) return UNAVAILABLE;

    return {
      claim: {
        available: true,
        trialStart: trialStartedAt,
        // A repeat attempt is not a legitimate new trial, so no trial_started.
        isNew: !repeat,
        repeat,
      },
      issueToken: token,
    };
  } catch {
    return UNAVAILABLE;
  }
}

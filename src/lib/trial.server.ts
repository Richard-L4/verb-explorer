/**
 * Server-side trial entitlement (server-only).
 *
 * The browser is no longer the authority for "has this visitor already had a
 * trial". The server issues an opaque, random, HttpOnly cookie and keeps the
 * entitlement in `public.trial_grants`.
 *
 * Identity layers, strongest first:
 *  1. the server-issued cookie,
 *  2. a salted one-way hash of a small device signal (so Incognito, cleared
 *     storage or another browser on the SAME device inherits the existing
 *     clock instead of restarting it, while a different device in the same
 *     household still gets its own full trial),
 *  3. a rolling 24-hour per-network velocity guard against scripted abuse.
 *
 * Privacy:
 *  - the cookie value is random and meaningless; nothing personal is in it,
 *  - only a SHA-256 of the cookie value is stored,
 *  - the network address is never stored: only a salted one-way SHA-256,
 *  - the device signal is never stored: only a salted one-way SHA-256.
 */

import { createHash, randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "./payments.server";
import { readEnv } from "./env.server";

export const TRIAL_COOKIE = "vw_vid";
export const TRIAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 3650; // ~10 years

/**
 * Rolling velocity guard. More than this many NEW trials from one network
 * within the window is treated as scripted abuse: further visitors inherit the
 * oldest clock instead of restarting it. A real household never reaches this.
 */
export const NETWORK_VELOCITY_LIMIT = 8;
export const NETWORK_VELOCITY_WINDOW_MS = 24 * 60 * 60 * 1000;

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

export type DeviceSignalInput = Record<string, string> | null | undefined;

/**
 * One-way, salted hash of the device signal combined with the network value.
 * Combining with the network keeps the hash from being a stable cross-network
 * identifier for the same device.
 */
export function hashDevice(signal: DeviceSignalInput, address: string | null | undefined): string | null {
  if (!signal) return null;
  const keys = Object.keys(signal).sort();
  const parts = keys.map((key) => `${key}=${signal[key] ?? ""}`);
  const meaningful = parts.filter((p) => !p.endsWith("="));
  // Too little information to be a useful signal — do not risk collisions.
  if (meaningful.length < 4) return null;
  const network = hashNetwork(address) ?? "no-net";
  return sha256(`dev:${salt()}:${network}:${parts.join("|")}`);
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
  device?: DeviceSignalInput;
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
    const deviceHash = hashDevice(input.device, input.address);
    let trialStartedAt = new Date().toISOString();
    let repeat = false;

    // 2a. Same device as an existing grant? Incognito, cleared storage or a
    // second browser on one machine all land here. Access is never blocked:
    // the visitor simply inherits the oldest clock for this device.
    if (deviceHash) {
      const { data, error } = await db
        .from("trial_grants")
        .select("trial_started_at")
        .eq("device_hash", deviceHash)
        .order("trial_started_at", { ascending: true })
        .limit(1);
      if (error) return UNAVAILABLE;
      const rows = (data ?? []) as { trial_started_at: string }[];
      if (rows.length > 0) {
        trialStartedAt = rows[0]!.trial_started_at;
        repeat = true;
      }
    }

    // 2b. Velocity guard: many brand-new trials from one network in a short
    // window looks scripted, so further grants inherit rather than restart.
    if (!repeat && networkHash) {
      const since = new Date(Date.now() - NETWORK_VELOCITY_WINDOW_MS).toISOString();
      const { data, error } = await db
        .from("trial_grants")
        .select("trial_started_at")
        .eq("network_hash", networkHash)
        .gte("created_at", since)
        .order("trial_started_at", { ascending: true });
      if (error) return UNAVAILABLE;
      const rows = (data ?? []) as { trial_started_at: string }[];
      if (rows.length >= NETWORK_VELOCITY_LIMIT) {
        trialStartedAt = rows[0]!.trial_started_at;
        repeat = true;
      }
    }

    const token = newToken();
    const { error: insertError } = await db.from("trial_grants").insert({
      token_hash: hashToken(token),
      network_hash: networkHash,
      device_hash: deviceHash,
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

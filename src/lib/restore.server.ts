/**
 * Server-only: verified Restore by email and creator-attempt rate limiting.
 * Codes are never stored or logged in clear: only HMACs. Emails are stored as
 * HMACs too. Storage is injected so the logic can be unit-tested.
 */
import { hmacHex, safeEqual } from "./content-pass.server";

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const EMAIL_REQUESTS_PER_HOUR = 3;
export const NETWORK_REQUESTS_PER_HOUR = 10;
export const CREATOR_ATTEMPTS_PER_HOUR = 10;
const HOUR = 60 * 60 * 1000;

export type Purpose = "restore" | "creator";
export interface CodeRow {
  id: string;
  purpose: Purpose;
  email_hash: string | null;
  code_hash: string | null;
  network_hash: string | null;
  attempts: number;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface CodeStore {
  countSince(filter: { purpose: Purpose; email_hash?: string; network_hash?: string }, sinceIso: string): Promise<number>;
  insert(row: Omit<CodeRow, "id" | "attempts" | "used_at" | "created_at">): Promise<void>;
  latestActive(purpose: Purpose, email_hash: string, nowIso: string): Promise<CodeRow | null>;
  bumpAttempts(id: string, attempts: number): Promise<void>;
  /** Marks used only if still unused; returns true when this call consumed it. */
  consume(id: string, nowIso: string): Promise<boolean>;
}

export interface RestoreDeps {
  store: CodeStore;
  secret: string;
  hasPurchase: (email: string) => Promise<boolean>;
  sendCode: (email: string, code: string) => Promise<void>;
  randomCode?: () => string;
  now?: () => number;
}

export const normaliseEmail = (e: string) => e.trim().toLowerCase();
export const hashEmail = (secret: string, email: string) => hmacHex(secret, `email:${normaliseEmail(email)}`);
export const hashNetworkValue = async (secret: string, address: string | null) =>
  address ? hmacHex(secret, `net:${address}`) : null;
const hashCode = (secret: string, emailHash: string, code: string) => hmacHex(secret, `code:${emailHash}:${code}`);

export function sixDigitCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000;
  return n.toString().padStart(6, "0");
}

/** Always resolves to the same generic answer so purchase status never leaks. */
export async function requestRestoreCode(deps: RestoreDeps, email: string, address: string | null) {
  const now = deps.now?.() ?? Date.now();
  const since = new Date(now - HOUR).toISOString();
  const emailHash = await hashEmail(deps.secret, email);
  const networkHash = await hashNetworkValue(deps.secret, address);

  const perEmail = await deps.store.countSince({ purpose: "restore", email_hash: emailHash }, since);
  const perNet = networkHash
    ? await deps.store.countSince({ purpose: "restore", network_hash: networkHash }, since)
    : 0;
  if (perEmail >= EMAIL_REQUESTS_PER_HOUR || perNet >= NETWORK_REQUESTS_PER_HOUR) {
    return { sent: true as const };
  }

  const purchased = await deps.hasPurchase(normaliseEmail(email));
  const code = (deps.randomCode ?? sixDigitCode)();
  await deps.store.insert({
    purpose: "restore",
    email_hash: emailHash,
    // Non-buyers get a row (for rate limiting) that can never be verified.
    code_hash: purchased ? await hashCode(deps.secret, emailHash, code) : null,
    network_hash: networkHash,
    expires_at: new Date(now + CODE_TTL_MS).toISOString(),
  });
  if (purchased) await deps.sendCode(normaliseEmail(email), code);
  return { sent: true as const };
}

/** Returns true only when the code is right, unexpired, unused, within attempts, and the purchase still exists. */
export async function verifyRestoreCode(deps: RestoreDeps, email: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const now = deps.now?.() ?? Date.now();
  const nowIso = new Date(now).toISOString();
  const emailHash = await hashEmail(deps.secret, email);
  const row = await deps.store.latestActive("restore", emailHash, nowIso);
  if (!row || !row.code_hash || row.used_at || Date.parse(row.expires_at) <= now) return false;
  if (row.attempts >= MAX_ATTEMPTS) return false;
  await deps.store.bumpAttempts(row.id, row.attempts + 1);
  const ok = await safeEqual(row.code_hash, await hashCode(deps.secret, emailHash, code), deps.secret);
  if (!ok) return false;
  if (!(await deps.store.consume(row.id, nowIso))) return false;
  return deps.hasPurchase(normaliseEmail(email));
}

/** Creator attempts: true when this network may try again (records the attempt). */
export async function creatorAttemptAllowed(store: CodeStore, secret: string, address: string | null, now = Date.now()) {
  const networkHash = (await hashNetworkValue(secret, address)) ?? "no-network";
  const count = await store.countSince(
    { purpose: "creator", network_hash: networkHash },
    new Date(now - HOUR).toISOString(),
  );
  if (count >= CREATOR_ATTEMPTS_PER_HOUR) return false;
  await store.insert({
    purpose: "creator",
    email_hash: null,
    code_hash: null,
    network_hash: networkHash,
    expires_at: new Date(now + HOUR).toISOString(),
  });
  return true;
}

/** Supabase-backed store (service role, server only). */
export async function supabaseCodeStore(): Promise<CodeStore> {
  const { getSupabaseAdmin } = await import("./payments.server");
  const db = getSupabaseAdmin();
  const t = () => db.from("restore_codes");
  return {
    async countSince(f, since) {
      let q = t().select("id", { count: "exact", head: true }).eq("purpose", f.purpose).gte("created_at", since);
      if (f.email_hash) q = q.eq("email_hash", f.email_hash);
      if (f.network_hash) q = q.eq("network_hash", f.network_hash);
      const { count, error } = await q;
      if (error) throw new Error("restore store unavailable");
      return count ?? 0;
    },
    async insert(row) {
      const { error } = await t().insert(row);
      if (error) throw new Error("restore store unavailable");
    },
    async latestActive(purpose, email_hash, nowIso) {
      const { data, error } = await t()
        .select("*")
        .eq("purpose", purpose)
        .eq("email_hash", email_hash)
        .is("used_at", null)
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw new Error("restore store unavailable");
      return (data?.[0] as CodeRow | undefined) ?? null;
    },
    async bumpAttempts(id, attempts) {
      await t().update({ attempts }).eq("id", id);
    },
    async consume(id, nowIso) {
      const { data } = await t().update({ used_at: nowIso }).eq("id", id).is("used_at", null).select("id");
      return Boolean(data && data.length);
    },
  };
}

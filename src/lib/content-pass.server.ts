/**
 * Server-only signed passes. The browser stores the opaque token; the server
 * verifies the HMAC signature and expiry AND re-checks the entitlement before
 * returning protected content. Local browser flags are never trusted.
 *
 * Kinds:
 *  - cs / email : purchase passes, re-checked against the purchases table.
 *  - preview    : only valid on a request served from a Lovable Preview host.
 *  - creator    : issued after the server matched CREATOR_ACCESS_KEY; bound to a
 *                 fingerprint of that key so rotating it revokes every pass.
 */
import { readEnv } from "./env.server";

export type PassKind = "cs" | "email" | "preview" | "creator";
export type PassRole = "purchase" | "creator";
export interface PassPayload {
  k: PassKind;
  r: string;
  iat: number;
  exp: number;
}

const DAY = 24 * 60 * 60 * 1000;
export const PASS_TTL: Record<PassKind, number> = {
  cs: 365 * DAY,
  email: 365 * DAY,
  creator: 30 * DAY,
  preview: 1 * DAY,
};

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function key(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function getSecret(override?: string): string {
  const s = override ?? readEnv("CONTENT_PASS_SECRET");
  if (!s) throw new Error("CONTENT_PASS_SECRET is not configured");
  return s;
}

export async function hmacHex(secret: string, value: string): Promise<string> {
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(secret), enc.encode(value)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison (compares HMACs so length never leaks). */
export async function safeEqual(a: string, b: string, secret?: string): Promise<boolean> {
  const s = getSecret(secret);
  const [x, y] = await Promise.all([hmacHex(s, `eq:${a}`), hmacHex(s, `eq:${b}`)]);
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0 && x.length === y.length;
}

/** Fingerprint of the creator key; never reveals the key itself. */
export async function creatorFingerprint(creatorKey: string, secret?: string): Promise<string> {
  return (await hmacHex(getSecret(secret), `creator:${creatorKey}`)).slice(0, 32);
}

export async function signPass(
  kind: PassKind,
  ref: string,
  secret?: string,
  now = Date.now(),
): Promise<string> {
  const payload: PassPayload = { k: kind, r: ref, iat: now, exp: now + PASS_TTL[kind] };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(getSecret(secret)), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

/** Returns the payload only when the signature is valid and the pass has not expired. */
export async function verifyPass(
  token: unknown,
  secret?: string,
  now = Date.now(),
): Promise<PassPayload | null> {
  if (typeof token !== "string" || token.length > 2048) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(getSecret(secret)), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64url(body))) as PassPayload;
    if (!["cs", "email", "preview", "creator"].includes(p.k) || typeof p.r !== "string" || !p.r) return null;
    if (typeof p.exp !== "number" || p.exp <= now) return null;
    return p;
  } catch {
    return null;
  }
}

export interface EntitlementChecks {
  sessionPaid: (id: string) => Promise<boolean>;
  emailPaid: (email: string) => Promise<boolean>;
  isPreviewRequest: () => boolean;
  /** Fingerprint of the configured CREATOR_ACCESS_KEY, or null if not set. */
  creatorFingerprint: () => Promise<string | null>;
}

/** Signature + expiry valid AND the underlying entitlement still holds. */
export async function passRole(
  token: unknown,
  checks: EntitlementChecks,
  secret?: string,
  now = Date.now(),
): Promise<PassRole | null> {
  const p = await verifyPass(token, secret, now);
  if (!p) return null;
  switch (p.k) {
    case "cs":
      return (await checks.sessionPaid(p.r)) ? "purchase" : null;
    case "email":
      return (await checks.emailPaid(p.r)) ? "purchase" : null;
    case "preview":
      return checks.isPreviewRequest() ? "creator" : null;
    case "creator": {
      const fp = await checks.creatorFingerprint();
      return fp && fp === p.r ? "creator" : null;
    }
  }
}

export async function passGrantsAccess(token: unknown, checks: EntitlementChecks, secret?: string) {
  return (await passRole(token, checks, secret)) !== null;
}

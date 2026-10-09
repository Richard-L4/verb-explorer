/**
 * Server-only signed purchase pass. The browser stores the opaque token; the
 * server verifies the HMAC signature AND re-checks the entitlement before
 * returning protected content. The local "unlocked" flag is never trusted.
 */
import { readEnv } from "./env.server";

export type PassKind = "cs" | "email" | "pi" | "preview";
export interface PassPayload {
  k: PassKind;
  r: string;
  iat: number;
}

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
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function getSecret(override?: string): string {
  const s = override ?? readEnv("CONTENT_PASS_SECRET");
  if (!s) throw new Error("CONTENT_PASS_SECRET is not configured");
  return s;
}

export async function signPass(kind: PassKind, ref: string, secret?: string): Promise<string> {
  const body = b64url(
    enc.encode(JSON.stringify({ k: kind, r: ref, iat: Date.now() } satisfies PassPayload)),
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", await key(getSecret(secret)), enc.encode(body)),
  );
  return `${body}.${b64url(sig)}`;
}

/** Returns the payload only when the signature is valid. */
export async function verifyPass(token: unknown, secret?: string): Promise<PassPayload | null> {
  if (typeof token !== "string" || token.length > 2048) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await key(getSecret(secret)),
      fromB64url(sig),
      enc.encode(body),
    );
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64url(body))) as PassPayload;
    if (!["cs", "email", "pi", "preview"].includes(p.k) || typeof p.r !== "string" || !p.r)
      return null;
    return p;
  } catch {
    return null;
  }
}

export interface EntitlementChecks {
  sessionPaid: (id: string) => Promise<boolean>;
  emailPaid: (email: string) => Promise<boolean>;
  paymentIntentPaid: (id: string) => Promise<boolean>;
  isPreviewRequest: () => boolean;
}

/** Signature valid AND the underlying entitlement still holds. */
export async function passGrantsAccess(token: unknown, checks: EntitlementChecks, secret?: string) {
  const p = await verifyPass(token, secret);
  if (!p) return false;
  switch (p.k) {
    case "cs":
      return checks.sessionPaid(p.r);
    case "email":
      return checks.emailPaid(p.r);
    case "pi":
      return checks.paymentIntentPaid(p.r);
    case "preview":
      return checks.isPreviewRequest();
  }
}

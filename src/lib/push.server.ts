/**
 * Server-only Web Push sender.
 *
 * The Node `web-push` package cannot run on the Cloudflare Worker runtime, so
 * VAPID signing (ES256 JWT) and payload encryption (RFC 8291 aes128gcm) are
 * implemented directly on the platform's WebCrypto. Private key material is
 * read through `readEnv` and never returned to a caller.
 */

import { readEnv } from "./env.server";

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushResult = "sent" | "gone" | "failed";

const encoder = new TextEncoder();

function b64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, data as unknown as ArrayBuffer));
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const prk = await hmac(salt, ikm);
  const okm = await hmac(prk, concat(info, Uint8Array.from([1])));
  return okm.slice(0, length);
}

/** Reconstructs the VAPID signing key from the stored public key + `d`. */
async function vapidKey(publicKey: string, privateD: string) {
  const raw = b64urlToBytes(publicKey);
  const x = bytesToB64url(raw.slice(1, 33));
  const y = bytesToB64url(raw.slice(33, 65));
  return crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d: privateD, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function vapidHeader(endpoint: string): Promise<string | null> {
  const publicKey = readEnv("VAPID_PUBLIC_KEY");
  const privateD = readEnv("VAPID_PRIVATE_KEY");
  const subject = readEnv("VAPID_SUBJECT") ?? "mailto:noreply@richard-wells.com";
  if (!publicKey || !privateD) return null;

  const audience = new URL(endpoint).origin;
  const header = bytesToB64url(encoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = bytesToB64url(
    encoder.encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: subject,
      }),
    ),
  );
  const signingInput = encoder.encode(`${header}.${body}`);
  const key = await vapidKey(publicKey, privateD);
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      signingInput as unknown as ArrayBuffer,
    ),
  );

  return `vapid t=${header}.${body}.${bytesToB64url(signature)}, k=${publicKey}`;
}

/** RFC 8291 single-record aes128gcm encryption of the notification payload. */
async function encryptPayload(target: PushTarget, plaintext: string): Promise<Uint8Array> {
  const uaPublic = b64urlToBytes(target.p256dh);
  const authSecret = b64urlToBytes(target.auth);

  const localKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const localPublic = new Uint8Array(await crypto.subtle.exportKey("raw", localKeys.publicKey));

  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic as unknown as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, localKeys.privateKey, 256),
  );

  const ikm = await hkdf(
    authSecret,
    shared,
    concat(encoder.encode("WebPush: info\0"), uaPublic, localPublic),
    32,
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, encoder.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey(
    "raw",
    cek as unknown as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const padded = concat(encoder.encode(plaintext), Uint8Array.from([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce as unknown as ArrayBuffer },
      aesKey,
      padded as unknown as ArrayBuffer,
    ),
  );

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);

  return concat(salt, recordSize, Uint8Array.from([localPublic.length]), localPublic, ciphertext);
}

/** Delivers one notification. Never throws. */
export async function sendPush(target: PushTarget, payload: unknown): Promise<PushResult> {
  try {
    const authorization = await vapidHeader(target.endpoint);
    if (!authorization) return "failed";

    const body = await encryptPayload(target, JSON.stringify(payload));

    const response = await fetch(target.endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "normal",
      },
      body: body as unknown as BodyInit,
    });

    if (response.status === 404 || response.status === 410) return "gone";
    if (!response.ok) return "failed";
    return "sent";
  } catch {
    return "failed";
  }
}

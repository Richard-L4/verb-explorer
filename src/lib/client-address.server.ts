/**
 * Server-only: the one trusted source of the visitor's network address.
 *
 * Production runs behind Cloudflare, which sets `cf-connecting-ip` itself and
 * rejects requests where a client tries to supply it (verified: HTTP 403).
 * Browser-controlled headers such as `x-forwarded-for`, `x-real-ip` and
 * `true-client-ip` pass through untouched, so they are never read.
 * When the trusted header is absent the address is unknown (null).
 */
const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:.]{2,45}$/i;

export function trustedAddressFrom(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v || v.length > 45) return null;
  if (IPV4.test(v)) return v.split(".").every((n) => Number(n) <= 255) ? v : null;
  return v.includes(":") && IPV6.test(v) ? v.toLowerCase() : null;
}

export function trustedAddressFromHeaders(headers: Headers): string | null {
  return trustedAddressFrom(headers.get("cf-connecting-ip"));
}

/** For use inside server functions / handlers with request context. */
export async function trustedRequestAddress(): Promise<string | null> {
  try {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    return trustedAddressFrom(getRequestHeader("cf-connecting-ip") ?? null);
  } catch {
    return null;
  }
}

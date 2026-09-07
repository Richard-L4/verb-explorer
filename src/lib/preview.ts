/**
 * Lovable Preview / editor host detection.
 *
 * Shared by the service-worker guard and by access.ts (which auto-enables the
 * existing creator mode inside preview). Deliberately hostname-only: the
 * production domain and any ordinary visitor browser must never match.
 */
export function isLovablePreviewHost(host?: string): boolean {
  const hostname =
    host ?? (typeof window !== "undefined" ? window.location.hostname : "");
  if (!hostname) return false;
  if (hostname.startsWith("id-preview--") || hostname.startsWith("preview--")) return true;
  if (hostname === "lovableproject.com" || hostname.endsWith(".lovableproject.com")) return true;
  if (hostname === "lovableproject-dev.com" || hostname.endsWith(".lovableproject-dev.com"))
    return true;
  if (hostname === "beta.lovable.dev" || hostname.endsWith(".beta.lovable.dev")) return true;
  if (hostname.endsWith("-dev.lovable.app")) return true;
  return false;
}

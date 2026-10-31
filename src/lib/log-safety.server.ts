/**
 * Log hygiene for payment and email code. Never pass raw provider responses or
 * full error objects to console.*; pass them through safeError()/redact() so
 * customer email addresses cannot reach server logs.
 */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const MAX_LEN = 300;

/** Masks an email for logs: "richard@example.com" → "r•••@e•••.com". */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "[redacted]";
  const [local = "", domain = ""] = email.split("@");
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${local.slice(0, 1)}•••@${host.slice(0, 1)}•••${tld}`;
}

/** Replaces every email-looking substring with "[email]" and caps length. */
export function redact(value: unknown): string {
  const text = typeof value === "string" ? value : value == null ? "" : String(value);
  const clean = text.replace(EMAIL_RE, "[email]");
  return clean.length > MAX_LEN ? `${clean.slice(0, MAX_LEN)}…` : clean;
}

export interface SafeErrorSummary {
  type: string;
  code?: string | undefined;
  status?: number | undefined;
  message: string;
}

/** Small, sanitised summary of any error: type, code, HTTP status, message. */
export function safeError(error: unknown): SafeErrorSummary {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    const type =
      (typeof e["type"] === "string" && e["type"]) ||
      (typeof e["name"] === "string" && e["name"]) ||
      (error instanceof Error ? error.constructor.name : "object");
    const code = typeof e["code"] === "string" || typeof e["code"] === "number" ? redact(String(e["code"])) : undefined;
    const rawStatus = e["statusCode"] ?? e["status"];
    const status = typeof rawStatus === "number" ? rawStatus : undefined;
    return { type: redact(type), code, status, message: redact(e["message"]) };
  }
  return { type: typeof error, message: redact(error) };
}

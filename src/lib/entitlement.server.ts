/**
 * Server-only: decides whether a visitor gets the complete content.
 * Full access = a re-verified purchase/creator pass, or an active trial proven by the
 * server's own trial record. Every failure falls back to the free SER vs ESTAR collection.
 * Dependencies are injected so the real decision path can be unit-tested.
 */
export interface EntitlementDeps {
  passRole: (pass: string) => Promise<"purchase" | "creator" | "preview" | null>;
  trialStart: () => Promise<string | null>;
  trialDays: number;
  now?: () => number;
}

export interface Entitlement {
  full: boolean;
  role: "purchase" | "creator" | "preview" | "trial" | null;
  /** ISO time when trial access ends; null for lifetime access or no access. */
  accessUntil: string | null;
}

export async function resolveEntitlement(pass: string | null, deps: EntitlementDeps): Promise<Entitlement> {
  if (pass) {
    try {
      const role = await deps.passRole(pass);
      if (role) return { full: true, role, accessUntil: null };
    } catch {
      /* fail closed: fall through to the trial check */
    }
  }
  try {
    const start = await deps.trialStart();
    const t = start ? Date.parse(start) : NaN;
    const now = deps.now?.() ?? Date.now();
    const end = t + deps.trialDays * 86_400_000;
    if (Number.isFinite(t) && t <= now && now < end) {
      return { full: true, role: "trial", accessUntil: new Date(end).toISOString() };
    }
  } catch {
    /* fail closed */
  }
  return { full: false, role: null, accessUntil: null };
}

/**
 * Server-only: decides which quiz questions a visitor may receive.
 * Every check fails closed to the public tier. Dependencies are injected so
 * the real decision path can be unit-tested.
 */
import { quizQuestionAllowed, quizTier, type QuizTier } from "./content-access";
import type { QuizQuestion } from "./quiz-public-build";
import { z } from "zod";

/** Only `pass` is read; any other browser field (paid, trial, tier…) is dropped. */
export const quizRequestSchema = z
  .object({ pass: z.string().max(2048).nullable().optional() })
  .strip();

export interface QuizDeps {
  /** Verifies a server-signed pass (purchase re-checked in the database). */
  passRole: (pass: string) => Promise<"purchase" | "creator" | null>;
  /** Trial start from the server's own HttpOnly cookie + trial_grants row. */
  trialStart: () => Promise<string | null>;
  bank: () => Promise<QuizQuestion[]>;
  trialDays: number;
  now?: () => number;
}

export async function resolveQuiz(
  input: unknown,
  deps: QuizDeps,
): Promise<{ tier: QuizTier; questions: QuizQuestion[] }> {
  const parsed = quizRequestSchema.safeParse(input);
  const pass = parsed.success ? parsed.data.pass ?? null : null;

  let role: "purchase" | "creator" | null = null;
  if (pass) {
    try {
      role = await deps.passRole(pass);
    } catch {
      role = null;
    }
  }

  let trialActive = false;
  if (!role) {
    try {
      const start = await deps.trialStart();
      const t = start ? Date.parse(start) : NaN;
      const now = deps.now?.() ?? Date.now();
      trialActive = Number.isFinite(t) && t <= now && now - t < deps.trialDays * 86_400_000;
    } catch {
      trialActive = false;
    }
  }

  const tier = quizTier({ role, trialActive });
  const bank = await deps.bank();
  return { tier, questions: bank.filter((q) => quizQuestionAllowed(q, tier)) };
}

/** Real dependencies used by the server function. */
export async function liveQuizDeps(): Promise<QuizDeps> {
  const { passRole } = await import("./content-pass.server");
  const { buildChecks } = await import("./content-checks.server");
  const { TRIAL_DAYS } = await import("./access");
  return {
    trialDays: TRIAL_DAYS,
    passRole: async (pass) => passRole(pass, await buildChecks()),
    trialStart: async () => {
      const { getCookie } = await import("@tanstack/react-start/server");
      const { TRIAL_COOKIE, hashToken } = await import("./trial.server");
      const token = getCookie(TRIAL_COOKIE);
      if (!token) return null;
      const { getSupabaseAdmin } = await import("./payments.server");
      const { data, error } = await getSupabaseAdmin()
        .from("trial_grants")
        .select("trial_started_at")
        .eq("token_hash", hashToken(token))
        .maybeSingle();
      if (error) throw new Error("trial lookup failed");
      return (data as { trial_started_at: string } | null)?.trial_started_at ?? null;
    },
    bank: async () => (await import("./quiz-full.server")).fullQuiz,
  };
}

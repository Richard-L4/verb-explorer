/**
 * Server-function endpoint called by the use-quiz browser hook.
 * Its handler runs only on the server and uses Supabase entitlement checks and the private quiz bank.
 * The browser receives filtered questions, not the server function implementation.
 */
import { createServerFn } from "@tanstack/react-start";

/**
 * Returns the quiz questions this visitor may see. The server decides the
 * tier from a server-signed pass or its own trial record; anything the
 * browser claims is ignored. Never cached.
 */
export const getQuizQuestions = createServerFn({ method: "POST" })
  // This validator only supplies a default; resolveQuiz validates the pass and drops claimed tiers.
  .inputValidator((input: unknown) => input ?? {})
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", "private, no-store");
    const { resolveQuiz, liveQuizDeps } = await import("./quiz.server");
    // await waits for the entitlement lookup; try/catch returns a public fallback on failure.
    try {
      return await resolveQuiz(data, await liveQuizDeps());
    } catch {
      console.error("[quiz] question lookup failed");
      return { tier: "public" as const, questions: null };
    }
  });

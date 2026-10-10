import { createServerFn } from "@tanstack/react-start";

/**
 * Returns the quiz questions this visitor may see. The server decides the
 * tier from a server-signed pass or its own trial record; anything the
 * browser claims is ignored. Never cached.
 */
export const getQuizQuestions = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => input ?? {})
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", "private, no-store");
    const { resolveQuiz, liveQuizDeps } = await import("./quiz.server");
    try {
      return await resolveQuiz(data, await liveQuizDeps());
    } catch {
      console.error("[quiz] question lookup failed");
      return { tier: "public" as const, questions: null };
    }
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function deps() {
  const { supabaseCodeStore } = await import("./restore.server");
  const { purchaseExistsForEmail, sendRestoreCodeEmail } = await import("./payments.server");
  const { readEnv } = await import("./env.server");
  const secret = readEnv("CONTENT_PASS_SECRET");
  if (!secret) throw new Error("not configured");
  return {
    store: await supabaseCodeStore(),
    secret,
    hasPurchase: purchaseExistsForEmail,
    sendCode: sendRestoreCodeEmail,
  };
}

/** Step 1: always the same answer, whether or not the email has a purchase. */
export const requestRestoreCode = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ email: z.string().email().max(320) }).parse(input))
  .handler(async ({ data }) => {
    const { requestRestoreCode: run } = await import("./restore.server");
    const { requestAddress } = await import("./content-checks.server");
    try {
      await run(await deps(), data.email, await requestAddress());
    } catch {
      console.error("[restore] code request failed");
      return { ok: false as const };
    }
    return { ok: true as const };
  });

/** Step 2: the server decides; a pass is issued only after the code is verified. */
export const verifyRestoreCode = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ email: z.string().email().max(320), code: z.string().max(12) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { verifyRestoreCode: run, normaliseEmail } = await import("./restore.server");
    const { signPass } = await import("./content-pass.server");
    try {
      if (await run(await deps(), data.email, data.code.trim())) {
        return { ok: true as const, pass: await signPass("email", normaliseEmail(data.email)) };
      }
    } catch {
      console.error("[restore] verification failed");
    }
    return { ok: false as const, pass: null };
  });

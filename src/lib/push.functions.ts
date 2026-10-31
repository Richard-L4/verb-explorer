/**
 * Server-function handlers for browser reminder registration and cancellation.
 * Run on the server and store subscriptions in Supabase; private push keys stay server-side.
 * A server function lets browser code request work without receiving the server implementation.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** The browser needs the public half of the signing key to register. */
export const getPushPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const { readEnv } = await import("./env.server");
  return { publicKey: readEnv("VAPID_PUBLIC_KEY") ?? null };
});

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(16).max(400),
  auth: z.string().min(8).max(200),
});

const ONE_YEAR = 60 * 60 * 24 * 365;

async function reminderStore() {
  const { getSupabaseAdmin } = await import("./payments.server");
  const db = getSupabaseAdmin();
  return {
    async find(endpoint: string) {
      const { data, error } = await db
        .from("push_subscriptions")
        .select("p256dh, auth")
        .eq("endpoint", endpoint)
        .maybeSingle();
      return { row: data ?? null, error: !!error };
    },
    async upsert(row: { endpoint: string; p256dh: string; auth: string }) {
      const { error } = await db
        .from("push_subscriptions")
        .upsert({ ...row, active: true, last_seen_at: new Date().toISOString() }, { onConflict: "endpoint" });
      return !error;
    },
    async deactivate(endpoint: string) {
      const { error } = await db
        .from("push_subscriptions")
        .update({ active: false, last_seen_at: new Date().toISOString() })
        .eq("endpoint", endpoint);
      return !error;
    },
  };
}

/**
 * Stores (or refreshes) this browser's delivery target. No personal data.
 * An existing target can only be replaced by the browser that owns it.
 */
export const savePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((input) => subscriptionSchema.parse(input))
  // The validator above parses untrusted input first; only its result reaches data.
  // async returns a Promise; await waits for server work without blocking other requests.
  .handler(async ({ data }) => {
    // try/catch reports storage or signing failure without granting an unproven ownership change.
    try {
      const { getCookie, setCookie } = await import("@tanstack/react-start/server");
      const { PUSH_OWNER_COOKIE, handleSave, reminderSecret } = await import("./push-owner.server");
      const secret = reminderSecret();
      if (!secret) return { ok: false };
      const result = await handleSave(secret, await reminderStore(), data, getCookie(PUSH_OWNER_COOKIE));
      if (!result.ok || !result.token) return { ok: false };
      setCookie(PUSH_OWNER_COOKIE, result.token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: ONE_YEAR,
      });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

/** Marks this browser's delivery target inactive; only its owner may do so. */
export const removePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        endpoint: z.string().url().max(2000),
        p256dh: z.string().min(16).max(400).optional(),
        auth: z.string().min(8).max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const { getCookie } = await import("@tanstack/react-start/server");
      const { PUSH_OWNER_COOKIE, handleCancel, reminderSecret } = await import("./push-owner.server");
      const secret = reminderSecret();
      if (!secret) return { ok: false };
      return await handleCancel(secret, await reminderStore(), data, getCookie(PUSH_OWNER_COOKIE));
    } catch {
      return { ok: false };
    }
  });

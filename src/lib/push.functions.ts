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

/** Stores (or refreshes) this browser's delivery target. No personal data. */
export const savePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((input) => subscriptionSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const { getSupabaseAdmin } = await import("./payments.server");
      const db = getSupabaseAdmin();
      const now = new Date().toISOString();

      const { error } = await db.from("push_subscriptions").upsert(
        {
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          active: true,
          last_seen_at: now,
        },
        { onConflict: "endpoint" },
      );

      if (error) return { ok: false };
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

/** Marks this browser's delivery target inactive when reminders are turned off. */
export const removePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ endpoint: z.string().url().max(2000) }).parse(input))
  .handler(async ({ data }) => {
    try {
      const { getSupabaseAdmin } = await import("./payments.server");
      const db = getSupabaseAdmin();
      const { error } = await db
        .from("push_subscriptions")
        .update({ active: false, last_seen_at: new Date().toISOString() })
        .eq("endpoint", data.endpoint);
      return { ok: !error };
    } catch {
      return { ok: false };
    }
  });

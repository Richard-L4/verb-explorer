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

/**
 * Stores (or refreshes) this browser's delivery target. No personal data.
 * An existing target can only be replaced by the browser that owns it.
 */
export const savePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((input) => subscriptionSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const { getCookie, setCookie } = await import("@tanstack/react-start/server");
      const { readEnv } = await import("./env.server");
      const { PUSH_OWNER_COOKIE, maySave, ownerToken } = await import("./push-owner.server");
      const { getSupabaseAdmin } = await import("./payments.server");
      const secret = readEnv("CONTENT_PASS_SECRET");
      if (!secret) return { ok: false };
      const db = getSupabaseAdmin();

      const { data: stored, error: readError } = await db
        .from("push_subscriptions")
        .select("p256dh, auth")
        .eq("endpoint", data.endpoint)
        .maybeSingle();
      if (readError) return { ok: false };

      const allowed = await maySave(secret, stored ?? null, {
        endpoint: data.endpoint,
        cookieToken: getCookie(PUSH_OWNER_COOKIE),
        p256dh: data.p256dh,
        auth: data.auth,
      });
      if (!allowed) return { ok: false };

      const { error } = await db.from("push_subscriptions").upsert(
        {
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          active: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );
      if (error) return { ok: false };

      setCookie(PUSH_OWNER_COOKIE, await ownerToken(secret, data.endpoint), {
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
      const { readEnv } = await import("./env.server");
      const { PUSH_OWNER_COOKIE, mayCancel } = await import("./push-owner.server");
      const { getSupabaseAdmin } = await import("./payments.server");
      const secret = readEnv("CONTENT_PASS_SECRET");
      if (!secret) return { ok: false };
      const db = getSupabaseAdmin();

      const { data: stored, error: readError } = await db
        .from("push_subscriptions")
        .select("p256dh, auth")
        .eq("endpoint", data.endpoint)
        .maybeSingle();
      if (readError) return { ok: false };

      const allowed = await mayCancel(secret, stored ?? null, {
        endpoint: data.endpoint,
        cookieToken: getCookie(PUSH_OWNER_COOKIE),
        p256dh: data.p256dh,
        auth: data.auth,
      });
      if (!allowed) return { ok: false };

      const { error } = await db
        .from("push_subscriptions")
        .update({ active: false, last_seen_at: new Date().toISOString() })
        .eq("endpoint", data.endpoint);
      return { ok: !error };
    } catch {
      return { ok: false };
    }
  });

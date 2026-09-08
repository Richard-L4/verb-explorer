import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily reminder dispatch, called once a day by the database scheduler.
 *
 * Authenticated with a shared secret; there is no way for a visitor to make
 * this send anything. Runs at a fixed UK time (the scheduler handles the
 * daylight-saving offset) and deactivates delivery targets the push service
 * reports as permanently gone.
 */
export const Route = createFileRoute("/api/public/send-daily-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { readEnv } = await import("@/lib/env.server");
        const expected = readEnv("REMINDER_CRON_SECRET");
        const provided = request.headers.get("x-reminder-secret") ?? "";

        if (!expected || provided.length !== expected.length || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { getSupabaseAdmin } = await import("@/lib/payments.server");
        const { sendPush } = await import("@/lib/push.server");
        const { buildReminder } = await import("@/lib/reminder-content");

        const db = getSupabaseAdmin();
        const { data, error } = await db
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("active", true)
          .limit(2000);

        if (error) {
          return Response.json({ ok: false, reason: "storage_unavailable" }, { status: 500 });
        }

        const payload = buildReminder();
        const rows = (data ?? []) as { id: string; endpoint: string; p256dh: string; auth: string }[];

        let sent = 0;
        let failed = 0;
        const gone: string[] = [];

        for (const row of rows) {
          const result = await sendPush(
            { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
            payload,
          );
          if (result === "sent") sent += 1;
          else if (result === "gone") gone.push(row.id);
          else failed += 1;
        }

        if (gone.length) {
          await db.from("push_subscriptions").update({ active: false }).in("id", gone);
        }

        return Response.json({ ok: true, targets: rows.length, sent, failed, deactivated: gone.length });
      },
    },
  },
});

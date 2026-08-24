import { createFileRoute } from "@tanstack/react-router";

const NAMES = [
  "STRIPE_SECRET_KEY",
  "STRIPE_SECRET_KEY_TEST",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_TEST_WEBHOOK_SECRET",
  "VERBWISE_SUPABASE_URL",
  "VERBWISE_SUPABASE_SERVICE_ROLE_KEY",
] as const;

/**
 * Temporary, names-only runtime diagnostic.
 *
 * Reports which env sources the running worker exposes and whether each
 * binding resolves. It never returns or logs a secret value.
 */
export const Route = createFileRoute("/api/public/env-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { readEnv, envPresence } = await import("@/lib/env.server");

        const rawKey = readEnv("STRIPE_SECRET_KEY_TEST") ?? readEnv("STRIPE_SECRET_KEY");
        const stripeKeyMode = rawKey
          ? rawKey.startsWith("sk_test_") || rawKey.startsWith("rk_test_")
            ? "test"
            : "live"
          : "absent";

        return new Response(
          JSON.stringify(
            {
              host: new URL(request.url).host,
              buildStamp: "env-check-v1",
              ...envPresence(NAMES),
              stripeKeyMode,
            },
            null,
            2,
          ),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});

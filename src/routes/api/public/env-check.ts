import { createFileRoute } from "@tanstack/react-router";

/**
 * Temporary, names-only runtime diagnostic.
 *
 * Reports WHICH env sources the running worker exposes and WHETHER each
 * binding is present. It never returns or logs a secret value.
 */
export const Route = createFileRoute("/api/public/env-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const names = [
          "STRIPE_SECRET_KEY",
          "STRIPE_SECRET_KEY_TEST",
          "STRIPE_WEBHOOK_SECRET",
          "STRIPE_TEST_WEBHOOK_SECRET",
          "VERBWISE_SUPABASE_URL",
          "VERBWISE_SUPABASE_SERVICE_ROLE_KEY",
        ] as const;

        const globalEnv = (
          globalThis as typeof globalThis & { __env__?: Record<string, unknown> }
        ).__env__;

        const presence = (source: Record<string, unknown> | undefined) =>
          Object.fromEntries(
            names.map((n) => [n, Boolean(source && typeof source[n] === "string" && (source[n] as string).length > 0)]),
          );

        // Key *shape* only (test vs live), never the value.
        const rawKey = process.env["STRIPE_SECRET_KEY_TEST"] ?? process.env["STRIPE_SECRET_KEY"];
        const keyMode = rawKey
          ? rawKey.startsWith("sk_test_") || rawKey.startsWith("rk_test_")
            ? "test"
            : "live"
          : "absent";

        return new Response(
          JSON.stringify(
            {
              host: new URL(request.url).host,
              runtime: {
                hasProcessEnv: typeof process !== "undefined" && !!process.env,
                hasGlobalEnvStash: !!globalEnv,
                userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
              },
              processEnv: presence(process.env as unknown as Record<string, unknown>),
              globalEnv: presence(globalEnv),
              stripeKeyMode: keyMode,
              buildStamp: __ENV_CHECK_STAMP__,
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

// Cheap build identity marker so we can tell which bundle a domain is serving.
const __ENV_CHECK_STAMP__ = "env-check-v1";

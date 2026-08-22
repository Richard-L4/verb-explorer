import { createFileRoute } from "@tanstack/react-router";

// Public, unauthenticated endpoint: Stripe posts here cross-origin with no
// session or cookies. CSRF is disabled for this path in src/start.ts.
export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Stripe requires the untouched raw request payload for verification.
        const body = await request.text();
        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          console.warn("[stripe-webhook] missing stripe-signature header");
          return new Response("Missing signature", { status: 400 });
        }

        // A Stripe account has separate signing secrets for test-mode and
        // live-mode endpoints; accept either so both dashboards work.
        const secrets = [
          process.env["STRIPE_WEBHOOK_SECRET"],
          process.env["STRIPE_TEST_WEBHOOK_SECRET"],
        ].filter((value): value is string => Boolean(value));

        if (secrets.length === 0) {
          console.warn("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured");
          return new Response("Webhook secret not configured", { status: 503 });
        }

        const { getStripe } = await import("@/lib/payments.server");
        const stripe = getStripe();

        let event: import("stripe").Stripe.Event | undefined;
        let lastError = "";
        for (const secret of secrets) {
          try {
            event = await stripe.webhooks.constructEventAsync(body, signature, secret);
            break;
          } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
          }
        }

        if (!event) {
          console.error(`[stripe-webhook] signature verification failed: ${lastError}`);
          return new Response("Invalid signature", { status: 400 });
        }

        // Acknowledge immediately; processing failures must not 4xx to Stripe.
        try {
          if (event.type === "checkout.session.completed") {
            const { recordPurchase } = await import("@/lib/payments.server");
            await recordPurchase(event.data.object);
          } else if (event.type === "payment_intent.succeeded") {
            const { markPaymentIntentPaid } = await import("@/lib/payments.server");
            await markPaymentIntentPaid(event.data.object.id);
          }
        } catch (error) {
          console.error("[stripe-webhook] processing error", error);
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});

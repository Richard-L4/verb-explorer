/**
 * Server-only HTTP route receiving Stripe payment notifications, called by Stripe, not the browser.
 * A webhook is a service-to-service notification; verified events use Supabase and Resend helpers.
 */
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

        // Mode comes from this Worker's own request URL: production addresses use only the
        // live signing secret, preview/localhost only the test one. No cross-mode fallback.
        const { stripeConfigForRequest, StripeConfigError } = await import("@/lib/stripe-mode.server");
        let config: Awaited<ReturnType<typeof stripeConfigForRequest>>;
        try {
          config = await stripeConfigForRequest(request);
        } catch (error) {
          if (error instanceof StripeConfigError) {
            console.warn("[stripe-webhook] payments not configured for this address");
            return new Response("Payments not configured", { status: 503 });
          }
          throw error;
        }
        if (!config.webhookSecret) {
          console.warn(`[stripe-webhook] ${config.webhookSecretName} is not configured`);
          return new Response("Webhook secret not configured", { status: 503 });
        }
        const secrets = [config.webhookSecret];

        const { stripeClient } = await import("@/lib/payments.server");
        const stripe = stripeClient(config);

        let event: import("stripe").Stripe.Event | undefined;
        let lastError = "";
        for (const secret of secrets) {
          try {
            // await verifies authenticity before processing; the surrounding try/catch tries the
            // other configured secret on failure, never accepts an unverified event.
            event = await stripe.webhooks.constructEventAsync(body, signature, secret);
            break;
          } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
          }
        }

        if (!event) {
          const { redact } = await import("@/lib/log-safety.server");
          console.error("[stripe-webhook] signature verification failed:", redact(lastError));
          return new Response("Invalid signature", { status: 400 });
        }

        // A test event never acts on a live address, nor a live event on a test address.
        if (event.livemode !== (config.mode === "live")) {
          console.warn("[stripe-webhook] event mode does not match this address; ignored");
          return new Response("Wrong mode", { status: 400 });
        }

        // Processing below is awaited before the 200 response; caught errors are logged safely.
        // The acknowledgement does not by itself mean every storage/email action succeeded.
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
          const { safeError } = await import("@/lib/log-safety.server");
          console.error("[stripe-webhook] processing error", safeError(error));
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});

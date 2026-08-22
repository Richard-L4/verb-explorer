import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Stripe requires the untouched request payload for signature verification.
        const body = await request.text();
        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 401 });

        const secret = process.env['STRIPE_WEBHOOK_SECRET'];
        if (!secret) {
          console.warn("stripe-webhook: STRIPE_WEBHOOK_SECRET is not configured yet");
          return new Response("Webhook secret not configured", { status: 503 });
        }

        const { getStripe } = await import("@/lib/payments.server");
        const stripe = getStripe();

        try {
          await stripe.webhooks.constructEventAsync(body, signature, secret);
        } catch {
          return new Response("Invalid signature", { status: 401 });
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 401 });

        const secret = process.env['STRIPE_WEBHOOK_SECRET'];
        if (!secret) {
          console.warn("stripe-webhook: STRIPE_WEBHOOK_SECRET is not configured yet");
          return new Response("Webhook secret not configured", { status: 503 });
        }

        // Raw string body — required for signature verification.
        const body = await request.text();
        const { getStripe, recordPurchase, markPaymentIntentPaid } = await import(
          "@/lib/payments.server"
        );
        const stripe = getStripe();

        let event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, signature, secret);
        } catch {
          return new Response("Invalid signature", { status: 401 });
        }

        try {
          if (event.type === "checkout.session.completed") {
            await recordPurchase(event.data.object);
          } else if (event.type === "payment_intent.succeeded") {
            await markPaymentIntentPaid(event.data.object.id);
          }
        } catch (error) {
          console.error("Failed to record purchase", error);
          return new Response("Failed to record purchase", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});

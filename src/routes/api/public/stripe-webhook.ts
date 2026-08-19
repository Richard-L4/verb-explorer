import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 401 });

        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) {
          console.warn("stripe-webhook: STRIPE_WEBHOOK_SECRET is not configured yet");
          return new Response("Webhook secret not configured", { status: 503 });
        }

        const body = await request.text();
        const { getStripe, recordPurchase } = await import("@/lib/payments.server");
        const stripe = await getStripe();

        let event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, signature, secret);
        } catch {
          return new Response("Invalid signature", { status: 401 });
        }

        if (event.type === "checkout.session.completed") {
          try {
            await recordPurchase(event.data.object);
          } catch (error) {
            console.error("Failed to record purchase", error);
            return new Response("Failed to record purchase", { status: 500 });
          }
        }

        return new Response("ok");
      },
    },
  },
});

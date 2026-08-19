import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Starts a Stripe Checkout Session for the one-off Verb Wise unlock. */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ marketingConsent: z.boolean() })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const {
      getStripe,
      getVerbWisePriceId,
    } = await import("./payments.server");

    const { getRequest } =
      await import(
        "@tanstack/react-start/server"
      );

    try {
      const origin =
        new URL(getRequest().url).origin;

      const stripe = await getStripe();

      const priceId =
        await getVerbWisePriceId();

      const session =
        await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          success_url:
            `${origin}/unlock/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url:
            `${origin}/unlock?cancelled=1`,
          metadata: {
            marketing_consent:
              data.marketingConsent
                ? "true"
                : "false",
          },
          payment_intent_data: {
            metadata: {
              marketing_consent:
                data.marketingConsent
                  ? "true"
                  : "false",
            },
          },
        });

      if (!session.url) {
        throw new Error(
          "Stripe returned a session without a URL",
        );
      }

      console.log(
        "[checkout] session created",
        session.id,
        origin,
      );

      return { url: session.url };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        "[checkout] failed to create session:",
        message,
        error,
      );

      throw new Error(
        `[checkout] ${message}`,
      );
    }
  });

/**
 * Confirms a returning checkout session.
 *
 * Prefers the purchase row written by the webhook;
 * falls back to Stripe itself when the webhook has
 * not landed yet.
 */
export const confirmCheckout = createServerFn({
  method: "POST",
})
  .inputValidator((input) =>
    z
      .object({
        sessionId: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const {
      getStripe,
      recordPurchase,
      purchaseExists,
    } = await import("./payments.server");

    if (
      await purchaseExists(data.sessionId)
    ) {
      return {
        paid: true,
        recorded: true,
      };
    }

    const session =
      await (
        await getStripe()
      ).checkout.sessions.retrieve(
        data.sessionId,
      );

    if (
      session.payment_status !== "paid"
    ) {
      return {
        paid: false,
        recorded: false,
      };
    }

    await recordPurchase(session);

    return {
      paid: true,
      recorded: true,
    };
  });

/**
 * Restores access on another device from the
 * email used at checkout.
 */
export const restorePurchase = createServerFn({
  method: "POST",
})
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const {
      purchaseExistsForEmail,
    } = await import("./payments.server");

    return {
      found:
        await purchaseExistsForEmail(
          data.email,
        ),
    };
  });

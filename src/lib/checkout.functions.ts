import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Starts a Stripe Checkout Session for the one-off Verb Wise unlock. */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        marketingConsent: z.boolean(),
        // Anonymous analytics device id (optional; never identifies a person).
        deviceId: z.string().min(8).max(128).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getStripe, getVerbWisePriceId } = await import(
      "./payments.server"
    );

    const { getCookie, getRequest, setCookie } = await import("@tanstack/react-start/server");
    const { CLAIM_COOKIE, CLAIM_COOKIE_MAX_AGE, isClaimMarker, markerHash, newClaimMarker } = await import(
      "./purchase-claim.server"
    );

    try {
      const origin = new URL(getRequest().url).origin;

      // Browser-specific claim marker (HttpOnly); only its hash goes to Stripe.
      const existingMarker = getCookie(CLAIM_COOKIE);
      const marker = isClaimMarker(existingMarker) ? existingMarker : newClaimMarker();
      setCookie(CLAIM_COOKIE, marker, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: CLAIM_COOKIE_MAX_AGE,
      });
      const claimHash = await markerHash(marker);

      const stripe = getStripe();

      const priceId = getVerbWisePriceId();

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${origin}/unlock/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/unlock?cancelled=1`,
        metadata: {
          claim_hash: claimHash,
          marketing_consent: data.marketingConsent ? "true" : "false",
          ...(data.deviceId ? { device_id: data.deviceId } : {}),
        },
        payment_intent_data: {
          metadata: {
            marketing_consent: data.marketingConsent ? "true" : "false",
            ...(data.deviceId ? { device_id: data.deviceId } : {}),
          },
        },
      });

      if (!session.url) {
        throw new Error("Stripe returned a session without a URL");
      }

      console.log("[checkout] session created");

      // Analytics only: after the session was successfully created.
      if (data.deviceId) {
        const { recordTrialEvent } = await import("./analytics.server");
        await recordTrialEvent({ deviceId: data.deviceId, event: "checkout_started" });
      }

      return { url: session.url };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      const { safeError } = await import("./log-safety.server");
      console.error("[checkout] failed to create session:", safeError(error));

      throw new Error(`[checkout] ${message}`);
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
        sessionId: z.string().regex(/^cs_(test|live)_[A-Za-z0-9]{10,200}$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getCookie } = await import("@tanstack/react-start/server");
    const payments = await import("./payments.server");
    const { CLAIM_COOKIE, confirmAndClaim } = await import("./purchase-claim.server");
    const { signPass } = await import("./content-pass.server");

    const status = await confirmAndClaim(
      {
        verifiedSession: (id) => payments.fetchVerifiedVerbWiseSession(id),
        purchaseExists: (id) => payments.purchaseExists(id),
        recordPurchase: (session) =>
          payments.recordPurchase(session as import("stripe").Stripe.Checkout.Session),
        claim: async (id, ownerHash, minutes) => {
          const { data: ok, error } = await payments
            .getSupabaseAdmin()
            .rpc("claim_purchase" as never, {
              p_session_id: id,
              p_owner_hash: ownerHash,
              p_window_minutes: minutes,
            } as never);
          if (error) throw new Error("claim failed");
          return ok === true;
        },
      },
      data.sessionId,
      getCookie(CLAIM_COOKIE),
    );

    if (status !== "done") {
      return { status, paid: false, recorded: false, pass: null };
    }
    return {
      status,
      paid: true,
      recorded: true,
      pass: await signPass("cs", data.sessionId),
    };
  });

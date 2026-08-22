/**
 * Server-only Stripe + Supabase helpers.
 *
 * This file must only be imported by server-side code.
 * Secrets are read from process.env inside each helper.
 */

import Stripe from "stripe";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

/**
 * Stripe Price IDs
 *
 * LIVE:
 * price_1U66oMJ7wpJmIRgYHaLwO2VH
 *
 * TEST / SANDBOX:
 * price_1U6FgVQsnncBlv2AE3WrorZp
 */
export const VERB_WISE_LIVE_PRICE_ID =
  "price_1U66oMJ7wpJmIRgYHaLwO2VH";

export const VERB_WISE_TEST_PRICE_ID =
  "price_1U6FgVQsnncBlv2AE3WrorZp";

function getStripeSecretKey(): string {
  const key = process.env['STRIPE_SECRET_KEY'];

  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured",
    );
  }

  return key;
}

/**
 * Return the correct Stripe Price ID for the configured key.
 *
 * A test key can only use the test price, and a live key the live price,
 * so the mode is derived from the key itself. This covers standard secret
 * keys (`sk_test_…`) as well as restricted keys (`rk_test_…`).
 */
export function isTestMode(): boolean {
  const key = getStripeSecretKey();
  return key.startsWith("sk_test_") || key.startsWith("rk_test_");
}

export function getVerbWisePriceId(): string {
  return isTestMode()
    ? VERB_WISE_TEST_PRICE_ID
    : VERB_WISE_LIVE_PRICE_ID;
}

/** Create the server-side Stripe client. */
export function getStripe(): Stripe {
  return new Stripe(getStripeSecretKey(), {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/**
 * Create the server-side Supabase admin client.
 *
 * The service-role key bypasses Row Level Security.
 * This function must NEVER be called from client-side code.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url =
    process.env['VERBWISE_SUPABASE_URL'] ??
    process.env['SUPABASE_URL'];

  const key =
    process.env['VERBWISE_SUPABASE_SERVICE_ROLE_KEY'] ??
    process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!url || !key) {
    throw new Error(
      "Supabase server credentials are not configured",
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}


/**
 * Find the Supabase price row corresponding to
 * the Stripe price used by the current environment.
 */
async function findPriceRowId(
  db: SupabaseClient,
): Promise<string | null> {
  const stripePriceId =
    getVerbWisePriceId();

  const { data, error } = await db
    .from("prices")
    .select("id")
    .eq(
      "stripe_price_id",
      stripePriceId,
    )
    .maybeSingle();

  if (error) {
    console.error(
      "[stripe] Failed to find price row:",
      error.message,
    );

    return null;
  }

  return data?.id ?? null;
}

/**
 * Find an existing customer or create one.
 */
async function upsertCustomer(
  db: SupabaseClient,
  email: string | null,
  name: string | null,
  stripeCustomerId: string | null,
): Promise<string | null> {
  if (!email && !stripeCustomerId) {
    return null;
  }

  let existing = null;

  if (email) {
    const result = await db
      .from("customers")
      .select(
        "id, email, stripe_customer_id",
      )
      .eq("email", email)
      .maybeSingle();

    existing = result.data;
  } else if (stripeCustomerId) {
    const result = await db
      .from("customers")
      .select(
        "id, email, stripe_customer_id",
      )
      .eq(
        "stripe_customer_id",
        stripeCustomerId,
      )
      .maybeSingle();

    existing = result.data;
  }

  if (existing?.id) {
    if (
      stripeCustomerId &&
      existing.stripe_customer_id !==
        stripeCustomerId
    ) {
      await db
        .from("customers")
        .update({
          stripe_customer_id:
            stripeCustomerId,
        })
        .eq("id", existing.id);
    }

    return existing.id;
  }

  const { data, error } = await db
    .from("customers")
    .insert({
      email,
      name,
      stripe_customer_id:
        stripeCustomerId,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(
      "[stripe] Failed to create customer:",
      error.message,
    );

    return null;
  }

  return data?.id ?? null;
}

/**
 * Record a completed Stripe Checkout Session.
 *
 * The checkout session ID makes this operation
 * idempotent, so Stripe/webhook retries do not
 * create duplicate purchases.
 */
export async function recordPurchase(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.payment_status !== "paid") {
    return;
  }

  const db = getSupabaseAdmin();

  const { data: existing } =
    await db
      .from("purchases")
      .select("id")
      .eq(
        "stripe_checkout_session_id",
        session.id,
      )
      .maybeSingle();

  if (existing) {
    return;
  }

  const marketingConsent =
    session.metadata?.['marketing_consent'] ===
    "true";

  const email =
    session.customer_details?.email ??
    session.customer_email ??
    null;

  const name =
    session.customer_details?.name ??
    null;

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;

  const customerId =
    await upsertCustomer(
      db,
      email,
      name,
      stripeCustomerId,
    );

  const priceId =
    await findPriceRowId(db);

  const paymentIntent =
    typeof session.payment_intent ===
    "string"
      ? session.payment_intent
      : session.payment_intent?.id ??
        null;

  const {
    error: purchaseError,
  } = await db
    .from("purchases")
    .insert({
      customer_id: customerId,
      price_id: priceId,
      status: "paid",
      purchase_type: "one_time",
      start_date: new Date()
        .toISOString()
        .slice(0, 10),
      stripe_payment_intent:
        paymentIntent,
      stripe_payment_id:
        paymentIntent,
      stripe_checkout_session_id:
        session.id,
      marketing_consent:
        marketingConsent,
    });

  if (purchaseError) {
    console.error(
      "[stripe] Failed to record purchase:",
      purchaseError.message,
    );

    throw purchaseError;
  }

  if (customerId) {
    const {
      error: preferenceError,
    } = await db
      .from(
        "communication_preferences",
      )
      .upsert(
        {
          customer_id: customerId,
          product_updates:
            marketingConsent,
          newsletter:
            marketingConsent,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "customer_id",
        },
      );

    if (preferenceError) {
      console.error(
        "[stripe] Failed to update communication preferences:",
        preferenceError.message,
      );
    }
  }
}

/**
 * Mark the purchase attached to a Stripe PaymentIntent as paid.
 *
 * Handles `payment_intent.succeeded`, which can arrive before or
 * after `checkout.session.completed`.
 */
export async function markPaymentIntentPaid(
  paymentIntentId: string,
): Promise<void> {
  const db = getSupabaseAdmin();

  const { error } = await db
    .from("purchases")
    .update({ status: "paid" })
    .eq(
      "stripe_payment_intent",
      paymentIntentId,
    );

  if (error) {
    console.error(
      "[stripe] Failed to mark payment intent paid:",
      error.message,
    );

    throw error;
  }
}

/**
 * Check whether a Checkout Session has already
 * been recorded as a purchase.
 */
export async function purchaseExists(
  sessionId: string,
): Promise<boolean> {
  const db = getSupabaseAdmin();

  const { data } = await db
    .from("purchases")
    .select("id")
    .eq(
      "stripe_checkout_session_id",
      sessionId,
    )
    .maybeSingle();

  return Boolean(data);
}

/**
 * Check whether an email address has an existing
 * paid purchase.
 */
export async function purchaseExistsForEmail(
  email: string,
): Promise<boolean> {
  const db = getSupabaseAdmin();

  const normalisedEmail =
    email.trim().toLowerCase();

  const { data: customer } =
    await db
      .from("customers")
      .select("id")
      .eq(
        "email",
        normalisedEmail,
      )
      .maybeSingle();

  if (!customer?.id) {
    return false;
  }

  const { data: purchases } =
    await db
      .from("purchases")
      .select("id")
      .eq(
        "customer_id",
        customer.id,
      )
      .eq("status", "paid")
      .limit(1);

  return Boolean(
    purchases &&
      purchases.length > 0,
  );
}

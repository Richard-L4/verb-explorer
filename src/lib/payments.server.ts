/**
 * Server-only Stripe + Supabase helpers.
 *
 * This file must only be imported by server-side code.
 * Every helper receives the resolved Cloudflare Worker env explicitly.
 */

import Stripe from "stripe";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { WorkerEnv } from "./worker-env";

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

/**
 * Return the current Stripe mode.
 *
 * STRIPE_MODE=test  -> Sandbox
 * STRIPE_MODE=live  -> Live
 *
 * Any value other than "test" is treated as live.
 */
export function getStripeMode(
  env: WorkerEnv,
): "test" | "live" {
  return env.STRIPE_MODE === "test"
    ? "test"
    : "live";
}

/**
 * Return the correct Stripe Price ID for the
 * current environment.
 */
export function getVerbWisePriceId(
  env: WorkerEnv,
): string {
  return getStripeMode(env) === "test"
    ? VERB_WISE_TEST_PRICE_ID
    : VERB_WISE_LIVE_PRICE_ID;
}

/**
 * Create the server-side Stripe client.
 *
 * The key is selected automatically:
 *
 * test -> STRIPE_TEST_SECRET_KEY
 * live -> STRIPE_SECRET_KEY
 */
export function getStripe(
  env: WorkerEnv,
): Stripe {
  const mode = getStripeMode(env);

  const keyName =
    mode === "test"
      ? "STRIPE_TEST_SECRET_KEY"
      : "STRIPE_SECRET_KEY";

  const key =
    mode === "test"
      ? env.STRIPE_TEST_SECRET_KEY
      : env.STRIPE_SECRET_KEY;

  console.info(
    `[stripe] mode=${mode} key_source=${keyName} present=${Boolean(key)}`,
  );

  if (!key) {
    throw new Error(
      `${keyName} is not configured`,
    );
  }

  return new Stripe(key, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/**
 * Create the server-side Supabase admin client.
 *
 * The service-role key bypasses Row Level Security.
 * This function must NEVER be called from client-side code.
 */
export function getSupabaseAdmin(
  env: WorkerEnv,
): SupabaseClient {
  const url = env.VERBWISE_SUPABASE_URL;

  const key =
    env.VERBWISE_SUPABASE_SERVICE_ROLE_KEY;

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
  env: WorkerEnv,
): Promise<string | null> {
  const stripePriceId =
    getVerbWisePriceId(env);

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
  env: WorkerEnv,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.payment_status !== "paid") {
    return;
  }

  const db = getSupabaseAdmin(env);

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
    await findPriceRowId(db, env);

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
 * Check whether a Checkout Session has already
 * been recorded as a purchase.
 */
export async function purchaseExists(
  env: WorkerEnv,
  sessionId: string,
): Promise<boolean> {
  const db = getSupabaseAdmin(env);

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
  env: WorkerEnv,
  email: string,
): Promise<boolean> {
  const db = getSupabaseAdmin(env);

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

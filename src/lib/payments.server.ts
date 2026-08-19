/**
 * Server-only Stripe + Supabase helpers.
 *
 * This file must only be imported by server-side code.
 */

import Stripe from "stripe";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

export const VERB_WISE_PRICE_ID = "price_1U66oMJ7wpJmIRgYHaLwO2VH";

/**
 * Read an environment variable from the current runtime.
 *
 * Cloudflare/TanStack Start exposes Worker bindings through:
 * request.runtime.cloudflare.env
 *
 * Local development can use process.env.
 */
export async function readEnv(
  name: string,
): Promise<string | undefined> {
  // Cloudflare / TanStack Start
  try {
    const { getRequest } = await import(
      "@tanstack/react-start/server"
    );

    const request = getRequest() as Request & {
      runtime?: {
        cloudflare?: {
          env?: Record<string, unknown>;
        };
      };
    };

    const cloudflareEnv = request.runtime?.cloudflare?.env;

    if (cloudflareEnv) {
      const value = cloudflareEnv[name];

      if (
        typeof value === "string" &&
        value.length > 0
      ) {
        if (name === "STRIPE_SECRET_KEY") {
          console.info(
            "[env] STRIPE_SECRET_KEY present=true source=cloudflare",
          );
        }

        return value;
      }
    }
  } catch {
    // No active request context.
  }

  // Local Node development
  const processEnv =
    typeof process !== "undefined"
      ? process.env
      : undefined;

  const value = processEnv?.[name];

  if (
    typeof value === "string" &&
    value.length > 0
  ) {
    if (name === "STRIPE_SECRET_KEY") {
      console.info(
        "[env] STRIPE_SECRET_KEY present=true source=process.env",
      );
    }

    return value;
  }

  console.error(
    `[env] ${name} not found`,
  );

  return undefined;
}

/**
 * Create the server-side Stripe client.
 */
export async function getStripe(): Promise<Stripe> {
  const key = await readEnv("STRIPE_SECRET_KEY");

  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured",
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
export async function getSupabaseAdmin(): Promise<SupabaseClient> {
  const url = await readEnv(
    "VERBWISE_SUPABASE_URL",
  );

  const key = await readEnv(
    "VERBWISE_SUPABASE_SERVICE_ROLE_KEY",
  );

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
 * Find the Supabase price row corresponding to the
 * Stripe price used by Verb Wise.
 */
async function findPriceRowId(
  db: SupabaseClient,
): Promise<string | null> {
  const { data, error } = await db
    .from("prices")
    .select("id")
    .eq("stripe_price_id", VERB_WISE_PRICE_ID)
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
      .select("id, email, stripe_customer_id")
      .eq("email", email)
      .maybeSingle();

    existing = result.data;
  } else if (stripeCustomerId) {
    const result = await db
      .from("customers")
      .select("id, email, stripe_customer_id")
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
      existing.stripe_customer_id !== stripeCustomerId
    ) {
      await db
        .from("customers")
        .update({
          stripe_customer_id: stripeCustomerId,
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
      stripe_customer_id: stripeCustomerId,
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
 * The checkout session ID makes this operation idempotent,
 * so Stripe/webhook retries do not create duplicate purchases.
 */
export async function recordPurchase(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.payment_status !== "paid") {
    return;
  }

  const db = await getSupabaseAdmin();

  const { data: existing } = await db
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
    session.metadata?.marketing_consent === "true";

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

  const customerId = await upsertCustomer(
    db,
    email,
    name,
    stripeCustomerId,
  );

  const priceId =
    await findPriceRowId(db);

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const { error: purchaseError } = await db
    .from("purchases")
    .insert({
      customer_id: customerId,
      price_id: priceId,
      status: "paid",
      purchase_type: "one_time",
      start_date: new Date()
        .toISOString()
        .slice(0, 10),
      stripe_payment_intent: paymentIntent,
      stripe_payment_id: paymentIntent,
      stripe_checkout_session_id: session.id,
      marketing_consent: marketingConsent,
    });

  if (purchaseError) {
    console.error(
      "[stripe] Failed to record purchase:",
      purchaseError.message,
    );

    throw purchaseError;
  }

  if (customerId) {
    const { error: preferenceError } =
      await db
        .from("communication_preferences")
        .upsert(
          {
            customer_id: customerId,
            product_updates: marketingConsent,
            newsletter: marketingConsent,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "customer_id",
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
  sessionId: string,
): Promise<boolean> {
  const db = await getSupabaseAdmin();

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
  const db = await getSupabaseAdmin();

  const normalisedEmail =
    email.trim().toLowerCase();

  const { data: customer } = await db
    .from("customers")
    .select("id")
    .eq("email", normalisedEmail)
    .maybeSingle();

  if (!customer?.id) {
    return false;
  }

  const { data: purchases } = await db
    .from("purchases")
    .select("id")
    .eq("customer_id", customer.id)
    .eq("status", "paid")
    .limit(1);

  return Boolean(
    purchases &&
      purchases.length > 0,
  );
}

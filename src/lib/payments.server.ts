/**
 * Server-only Stripe + Supabase helpers.
 * The `.server.ts` filename keeps this module out of every client bundle.
 */
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const VERB_WISE_PRICE_ID = "price_1U66oMJ7wpJmIRgYHaLwO2VH";

export function getStripe(): Stripe {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, {
    // Workers runtime: fetch-based transport, no Node http.
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/** Service-role client. Bypasses RLS — server handlers only. */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env["VERBWISE_SUPABASE_URL"];
  const key = process.env["VERBWISE_SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Supabase server credentials are not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function findPriceRowId(db: SupabaseClient): Promise<string | null> {
  const { data } = await db
    .from("prices")
    .select("id")
    .eq("stripe_price_id", VERB_WISE_PRICE_ID)
    .maybeSingle();
  return (data?.["id"] as string | undefined) ?? null;
}

async function upsertCustomer(
  db: SupabaseClient,
  email: string | null,
  name: string | null,
  stripeCustomerId: string | null,
): Promise<string | null> {
  if (!email && !stripeCustomerId) return null;

  const lookup = db.from("customers").select("id, email, stripe_customer_id").limit(1);
  const { data: existing } = email
    ? await lookup.eq("email", email)
    : await lookup.eq("stripe_customer_id", stripeCustomerId!);

  const found = existing?.[0]?.["id"] as string | undefined;
  if (found) {
    if (stripeCustomerId) {
      await db.from("customers").update({ stripe_customer_id: stripeCustomerId }).eq("id", found);
    }
    return found;
  }

  const { data: inserted } = await db
    .from("customers")
    .insert({ email, name, stripe_customer_id: stripeCustomerId })
    .select("id")
    .maybeSingle();
  return (inserted?.["id"] as string | undefined) ?? null;
}

/**
 * Records a completed Checkout Session in `purchases` (idempotent on
 * stripe_checkout_session_id) and mirrors the marketing choice into
 * `communication_preferences`.
 */
export async function recordPurchase(session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status !== "paid") return;
  const db = getSupabaseAdmin();

  const { data: already } = await db
    .from("purchases")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();
  if (already) return;

  const marketingConsent = session.metadata?.["marketing_consent"] === "true";
  const email =
    session.customer_details?.email ?? (session.customer_email as string | null) ?? null;
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);

  const customerId = await upsertCustomer(
    db,
    email,
    session.customer_details?.name ?? null,
    stripeCustomerId,
  );
  const priceId = await findPriceRowId(db);

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  await db.from("purchases").insert({
    customer_id: customerId,
    price_id: priceId,
    status: "paid",
    purchase_type: "one_time",
    start_date: new Date().toISOString().slice(0, 10),
    stripe_payment_intent: paymentIntent,
    stripe_payment_id: paymentIntent,
    stripe_checkout_session_id: session.id,
    marketing_consent: marketingConsent,
  });

  if (customerId) {
    await db
      .from("communication_preferences")
      .upsert(
        {
          customer_id: customerId,
          product_updates: marketingConsent,
          newsletter: marketingConsent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "customer_id" },
      )
      .select("id");
  }
}

/** True when a paid purchase row exists for this checkout session. */
export async function purchaseExists(sessionId: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("purchases")
    .select("id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  return Boolean(data);
}

/** True when any paid purchase exists for this email address. */
export async function purchaseExistsForEmail(email: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  const { data: customer } = await db
    .from("customers")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  const customerId = customer?.["id"] as string | undefined;
  if (!customerId) return false;
  const { data } = await db
    .from("purchases")
    .select("id")
    .eq("customer_id", customerId)
    .eq("status", "paid")
    .limit(1);
  return Boolean(data && data.length > 0);
}

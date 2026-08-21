# Switch to Lovable's Stripe integration and delete the custom env plumbing

## Goal

Stop hand-rolling Cloudflare Worker environment lookups for Stripe. Enable Lovable's Stripe integration with your own Stripe keys, and read the key the standard way (`process.env` inside the handler) so test keys drive test mode and live keys drive live mode automatically.

## Steps

1. **Enable the Stripe integration** — opens a secure form where you paste your own Stripe secret key. Use your test key while testing and swap to the live key when you go live; nothing in the code changes between the two. The key never passes through chat.

2. **Delete `src/lib/worker-env.ts`** — the whole `resolveWorkerEnv` / `WorkerEnv` / binding-diagnostics module goes away.

3. **Rewrite the env access in `src/lib/payments.server.ts`**
   - Remove `getStripeMode`, the test/live key selection, and the `env` parameter from every helper.
   - `getStripe()` reads `process.env.STRIPE_SECRET_KEY` inside the function and throws a clear error if absent.
   - `getSupabaseAdmin()` reads the existing Supabase URL/service-role secrets from `process.env` the same way. The Supabase queries themselves are untouched.
   - Price ID: Stripe test and live keys cannot share a price ID, so the price is chosen from the key prefix (`sk_test_` → the sandbox price `price_1U6FgVQsnncBlv2AE3WrorZp`, otherwise the live price `price_1U66oMJ7wpJmIRgYHaLwO2VH`). No `STRIPE_MODE` variable needed.

4. **Simplify `src/lib/checkout.functions.ts`** — drop the `resolveWorkerEnv()` calls and the `env` arguments from `getStripe`, `getVerbWisePriceId`, `recordPurchase`, `purchaseExists`, `purchaseExistsForEmail`. Checkout session creation, success/cancel URLs, and marketing-consent metadata stay exactly as they are.

5. **Simplify `src/routes/api/public/stripe-webhook.ts`** — read `STRIPE_WEBHOOK_SECRET` from `process.env` inside the handler; signature verification and `recordPurchase` behaviour unchanged.

6. **Verify** — typecheck, then confirm a checkout session is created against the configured key.

## Not changing

Supabase schema, queries or clients; any UI or component; any route or navigation; the Stripe products/prices themselves.

## Note

Lovable also offers a fully managed Stripe option that needs no keys or Stripe account. You asked for your own keys, so this plan uses the bring-your-own-key integration.

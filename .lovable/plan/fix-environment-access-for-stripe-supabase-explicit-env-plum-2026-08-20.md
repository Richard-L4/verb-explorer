# Fix environment access for Stripe/Supabase (explicit env plumbing)

## What the inspection found

- The deployment builds with Nitro's `cloudflare-module` preset. Its worker entry (`node_modules/nitro/dist/presets/cloudflare/runtime/_module-handler.mjs`) does exactly two things with the Cloudflare env before running the app:
  - `globalThis.__env__ = env`
  - attaches it to the raw Cloudflare request as `request.runtime.cloudflare.env`
- `src/server.ts` is the TanStack server entry, but Nitro calls it via `nitroApp.fetch(request)` — with **one argument**. So the `env` parameter our `server.ts` currently declares is never populated in production; the `globalThis.__env__` merge there is a no-op. The only real sources are the two Nitro-provided ones above (plus `cloudflare:workers`).
- `getRequest()` inside a server function returns the request object Nitro augmented, so `request.runtime.cloudflare.env` is the correct per-request handle — but relying on optional chaining deep inside `payments.server.ts` hides failures.
- Secrets currently configured for this project: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VERBWISE_SUPABASE_URL`, `VERBWISE_SUPABASE_SERVICE_ROLE_KEY`. **`STRIPE_MODE` and `STRIPE_TEST_SECRET_KEY` are not configured**, so test mode cannot resolve until they are added; live mode will fall back correctly.

## What will change

1. **New module `src/lib/worker-env.ts`** (server-only)
   - Defines a typed `WorkerEnv` with the five bindings: `STRIPE_MODE`, `STRIPE_TEST_SECRET_KEY`, `STRIPE_SECRET_KEY`, `VERBWISE_SUPABASE_URL`, `VERBWISE_SUPABASE_SERVICE_ROLE_KEY` (plus `STRIPE_WEBHOOK_SECRET`, already used by the webhook).
   - Exports `resolveWorkerEnv(): WorkerEnv` which reads, in order: the Nitro-augmented request (`getRequest().runtime.cloudflare.env`), `globalThis.__env__`, then `process.env` for local dev — and returns one plain object.
   - Logs names-only diagnostics (`present=true/false` per binding, never values).

2. **`src/lib/payments.server.ts`** — remove `readEnv` and all implicit lookups. Every helper takes the env explicitly:
   - `getStripeMode(env)`, `getVerbWisePriceId(env)`, `getStripe(env)`, `getSupabaseAdmin(env)`, `recordPurchase(env, session)`, `purchaseExists(env, id)`, `purchaseExistsForEmail(env, email)`, and the internal `findPriceRowId`/`upsertCustomer` helpers.
   - These become synchronous where they no longer await env lookups. Stripe and Supabase logic itself is untouched.

3. **Callers** — resolve the env once at the top of each handler and pass it down:
   - `src/lib/checkout.functions.ts`: `createCheckoutSession`, `confirmCheckout`, `restorePurchase` each call `resolveWorkerEnv()` inside their `.handler()` and pass it to the payment helpers.
   - `src/routes/api/public/stripe-webhook.ts`: resolves the env once, reads `STRIPE_WEBHOOK_SECRET` from it, and passes it into `getStripe` / `recordPurchase`.

4. **`src/server.ts`** — keep the existing `env` stash (harmless, and correct if the entry is ever invoked directly), no behavioural change.

## Note on the live failure

The previous diagnostics showed all three env sources existing while `STRIPE_SECRET_KEY` was absent from them. That means the running worker's environment did not contain the value at request time. After this refactor the diagnostics will report each of the five bindings individually, so the next failed checkout will show exactly which are missing. If they are still absent, the fix is a re-publish so the stored secrets are injected into the deployed worker — no further code change.

`STRIPE_MODE` / `STRIPE_TEST_SECRET_KEY` should be added as secrets if you want sandbox checkouts; without them the app stays in live mode.

## Out of scope

No changes to Stripe products/prices, checkout flow, Supabase schema or queries, or any UI.

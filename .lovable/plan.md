# Host-guarded Stripe live/test selection (Option A)

## What exists today (inspected)
- `src/lib/payments.server.ts`: `getStripeSecretKey()` reads `STRIPE_SECRET_KEY_TEST ?? STRIPE_SECRET_KEY`; mode is guessed from the key prefix; `getVerbWisePriceId()` picks the live or test price from that guess. Price IDs are constants in code (live `price_1U66oM…`, test `price_1U6FgV…`), not secrets.
- Used by: checkout creation (`checkout.functions.ts`), payment verification (`fetchVerifiedVerbWiseSession`, used by the success page and `recordPurchase`), the price-row lookup (`findPriceRowId`), the webhook (`api/public/stripe-webhook.ts`, which tries both `STRIPE_WEBHOOK_SECRET` and `STRIPE_TEST_WEBHOOK_SECRET`), and `api/public/env-check.ts`.
- Host helpers already exist: `PRODUCTION_ANALYTICS_HOSTS` (analytics) and `isLovablePreviewHost` (`src/lib/preview.ts`).

## Changes

### 1. New `src/lib/stripe-mode.server.ts` (pure, testable)
- `stripeModeForHost(hostname)` returns:
  - `"live"` for exactly `verb-wise.richard-wells.com` and `verb-wise-flashcards.lovable.app`;
  - `"test"` for preview hosts (`isLovablePreviewHost`) and `localhost` / `127.0.0.1`;
  - throws "Payments are not available on this address" for any other host (unknown hosts never get live or test).
- `stripeConfigForMode(mode, env)`:
  - live: key = `STRIPE_SECRET_KEY` only, must start `sk_live_`/`rk_live_`; price = live price ID; webhook secret = `STRIPE_WEBHOOK_SECRET`. `STRIPE_SECRET_KEY_TEST` is never read.
  - test: key = `STRIPE_SECRET_KEY_TEST` only, must start `sk_test_`/`rk_test_`; price = test price ID; webhook secret = `STRIPE_TEST_WEBHOOK_SECRET`. `STRIPE_SECRET_KEY` is never read.
  - Missing or wrong-prefix key → clear server error naming the missing setting (no value shown). No fallback to the other mode.
- `VERB_WISE_TEST_PRICE_ID` / `VERB_WISE_LIVE_PRICE_ID` stay code constants as today (you'll supply the new £14.99 IDs later); I will not add new secrets.

### 2. `payments.server.ts`
- `getStripe()`, `getVerbWisePriceId()`, `isTestMode()` derive from the current request host via the module above. Remove the `TEST ?? LIVE` line.
- Verification accepts a per-mode list of allowed price IDs (`acceptedPriceIds(mode)`), currently the existing £4.99 price, so existing purchases and any open £4.99 checkout sessions still verify after the £14.99 price is added later. Session mode must match: `cs_live_` only on live hosts, `cs_test_` only on test hosts.
- `findPriceRowId` keeps looking up the session's actual price, so legacy £4.99 purchases still link to their existing price row.

### 3. Webhook
- Mode from the request host (Stripe calls the production URL for the live endpoint). Uses only that mode's signing secret; also rejects events whose `livemode` disagrees with the host mode. Missing secret → 503 as today.
- Note: Stripe test-mode webhooks can only reach a preview address if Stripe can call it; if not, preview test purchases still unlock through the existing success-page verification path.

### 4. `env-check.ts`
- Reports the host's selected mode and whether its required key/price are present (names only, no values), using the same selector.

### 5. Tests — new `src/lib/stripe-mode.test.ts`
- Both production hosts → live; with both keys present, live key is chosen and the test key is never used.
- Production with only the test key → error, not test mode.
- Preview hosts (`id-preview--…`, `preview--…`, `*.lovableproject.com`) and localhost → test; with both keys present, test key chosen.
- Preview with only the live key → error, not live mode.
- Wrong-prefix key in either mode → error.
- Unknown host → error.
- Price: live host → live price; test host → test price; legacy £4.99 price accepted for verification; a test session is rejected on live hosts and vice versa.
- Full existing suite (293) must still pass unchanged.

## Not changed
Database, customer/purchase records, restore by email, access rules, prices shown, secrets, production configuration. Nothing published.

## After approval (your actions, not mine)
Add `STRIPE_SECRET_KEY_TEST` (and optionally `STRIPE_TEST_WEBHOOK_SECRET`) in project secrets; production ignores them by design.

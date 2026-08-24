# Status: what is currently unpublished

This is a read-only status report, not a build plan. No code or publish actions were taken.

## Headline

There are **no unpublished source-code changes**. Every committed change to
`src/` is already live on both `verb-wise-flashcards.lovable.app` and
`verb-wise.richard-wells.com` (the two now share one deployment — the
`.lovable.app` host 302-redirects to the custom domain).

The only committed-but-unpublished items are edits to `.lovable/plan.md`
(5 commits after the last code change). `.lovable/plan.md` is a planning
document and is **not** part of the deployed bundle, so it has zero runtime
effect.

## Evidence

- `git status` is clean — nothing uncommitted in the working tree.
- Last commit touching any file under `src/`: `3de2f49` (2026-08-24 00:17:41),
  integrated by merge `d44c84d` (00:18:01). After that, every commit
  (`5477d89`, `e980251`, `c45516f`, `6dd9261`, `8019274`, `b85703b`,
  `ca1a69c`) touches only `.lovable/plan.md`.
- Live `/api/public/env-check` on the custom domain returns the **current**
  response shape (`host`, `buildStamp: env-check-v1`, `hasProcessEnv`,
  `hasGlobalEnvStash`, `resolved`, `processEnv`, `globalEnv`,
  `stripeKeyMode: test`) — which matches `HEAD`'s `env-check.ts` exactly.
  The old shape (nested `runtime.{...}` and no top-level `resolved`) is gone,
  proving the `readEnv` refactor is deployed.
- `hasGlobalEnvStash: true` and `globalEnv.* = true` confirm `src/server.ts`
  (the `globalThis.__env__` stash) is live, so the unified secret-reading
  path is fully deployed.

## Which files changed since the last meaningful publish (all now LIVE)

| File | Change | Affects |
|---|---|---|
| `src/lib/env.server.ts` | NEW — unified `readEnv()` / `envPresence()` | Secret reading (all paths) |
| `src/lib/payments.server.ts` | `process.env` → `readEnv()` for Stripe key, Resend, Supabase admin | Stripe key resolution, Supabase admin client |
| `src/routes/api/public/env-check.ts` | Refactored to `envPresence` | Diagnostic only |
| `src/routes/api/public/stripe-webhook.ts` | `process.env` → `readEnv()` for webhook secrets | Webhook signature verification |

## Impact on the four areas you asked about

- **Stripe Checkout** (`src/lib/checkout.functions.ts`): **no changes** —
  not modified since well before the last publish. Nothing pending.
- **Payment confirmation** (`confirmCheckout` in `checkout.functions.ts`):
  **no changes**. The proposed refactor (return `paid: true` on Stripe's
  `paid` status regardless of the DB write) has **not been implemented** —
  it exists only as plan text.
- **Supabase purchases** (`recordPurchase` / `purchaseExists` in
  `payments.server.ts`): only the `readEnv` refactor is live. The proposed
  hardening (retry without optional columns on schema-mismatch) has
  **not been implemented**.
- **Unlock flow** (`src/routes/unlock.tsx`, `src/routes/unlock_.success.tsx`):
  **no changes**. The proposed error-surfacing in the success page has
  **not been implemented**.

## What this means for the open "pending payment" bug

The live code still calls `confirmCheckout`, which still requires the
Supabase `purchases` insert to succeed before it reports `paid: true`.
Because `stripe_checkout_session_id` is still missing from the live
`purchases` table (per the 10:38 log), a genuinely-paid Checkout Session
will still be reported as "Stripe hasn't confirmed this payment yet".

That is an **unimplemented fix**, not an **unpublished change**. Closing it
needs either (a) the schema column added, or (b) the `confirmCheckout`
refactor built and then published — your call.

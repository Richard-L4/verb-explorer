# Find the real checkout error

## What the logs show

I pulled the server logs (published and preview) for the last hour: there is **no record of the checkout function being called at all** — only page loads. So either the failure happened outside that window, or the request never reached the server.

What I could verify:

- All four credentials (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the two Supabase server keys) are present.
- The Stripe price `price_1U66oMJ7wpJmIRgYHaLwO2VH` is valid, active, live-mode, one-time, £4.99 GBP, and the secret key can read it.

So the key and price are not the problem. The cause is currently unconfirmed, and the app is hiding it: `Paywall.tsx` catches every failure and replaces it with the generic "We couldn't start the payment" message, and the server function logs nothing.

## Plan

1. **Make the failure visible.** Add `console.error` logging inside the checkout server function around the Stripe call, so the exact Stripe/runtime error text lands in the server logs with a searchable prefix (`[checkout]`).
2. **Surface a useful message in the UI.** Keep the friendly wording, but log the underlying error to the browser console and show a short reason code when the server returns one, so a failure is diagnosable without guesswork.
3. **Harden the server function shape.** `checkout.functions.ts` currently imports `getRequest` from `@tanstack/react-start/server` at module scope. Move that into the handler alongside the existing dynamic import, so the module stays a thin wrapper and nothing server-only can leak into the client bundle — a known cause of the client-side call failing before it ever reaches the server.
4. **Reproduce and read the real error.** Trigger the unlock flow against the running app, then read the server logs filtered on `[checkout]` and report the exact error to you. This creates an unpaid Stripe Checkout session (no charge).
5. **Fix whatever the log names**, then re-run the same flow to confirm the redirect to Stripe works.

## Technical notes

- Files touched: `src/lib/checkout.functions.ts` (logging + import move), `src/components/app/Paywall.tsx` (error surfacing only).
- No change to pricing, entitlement, trial, webhook, or database logic.

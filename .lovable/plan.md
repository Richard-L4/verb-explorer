# Connect your Supabase database and real Stripe checkout

Replaces the simulated £4.99 unlock with a real Stripe Checkout payment, recorded in your existing Supabase tables. No accounts — guest checkout.

## What I need from you first

Two secure forms (values never appear in chat):

- Supabase: project URL, publishable/anon key, service role key
- Stripe: secret key (`sk_...`) and, after the webhook is created, the webhook signing secret (`whsec_...`)

Once the Supabase keys are in, step 1 is to read your existing `customers`, `products`, `prices`, `purchases` schema and report exactly what (if anything) needs changing. I will not run any migration before showing you that report and getting your go-ahead. Expected gap for guest checkout: a way to look up a purchase by Stripe checkout session id — if `purchases` has no such column, I'll propose adding one nullable column rather than a new table.

## Purchase flow

1. On the unlock page the consent checkbox stays exactly as it is; "Pay £4.99 and Unlock" now calls the server.
2. The server creates a Stripe Checkout Session in payment mode for price `price_1U66oMJ7wpJmIRgYHaLwO2VH`, with success and cancel URLs back to the app, and redirects the browser to Stripe.
3. Stripe sends `checkout.session.completed` to a webhook endpoint. The webhook verifies the signature, upserts the buyer into `customers`, and writes the purchase row (amount, currency, Stripe ids, paid status) into `purchases`.
4. Stripe returns the user to `/unlock/success?session_id=...`. The app asks the server to confirm that session is paid, then records the unlock locally so access persists in that browser.
5. If the webhook hasn't landed yet, the success page retries briefly, then falls back to Stripe's own session status so the user is never left stuck.

Because there are no accounts, the unlock lives in the browser (as today) but is now backed by a real, verifiable purchase row. A "Restore purchase" box on the unlock page lets someone re-enter their checkout email or session link to unlock on another device.

## Access rules (unchanged otherwise)

Trial, free 10 cards, creator mode, banner logic and card locking all keep working exactly as now. The only change is that `unlocked` is set from a verified Stripe payment instead of a simulated button.

## Technical notes

- This app runs on TanStack Start, which has its own server runtime, so Stripe work goes in server functions (`src/lib/checkout.functions.ts`) and a public server route for the webhook (`src/routes/api/public/stripe-webhook.ts`) — not Supabase Edge Functions. Same security properties: the Stripe secret key and service role key are read only inside server handlers and never reach the browser.
- Webhook verification uses Stripe's async signature check (`constructEventAsync`), required in this edge runtime.
- Supabase writes from the webhook use the service role client, loaded inside the handler so it never enters the client bundle. Reads for confirming a session use a narrow server-side client.
- New files: `src/integrations/supabase/client.ts` + `types.ts` (generated from your schema), `client.server.ts`, `src/lib/checkout.functions.ts`, `src/routes/api/public/stripe-webhook.ts`, `src/routes/unlock.success.tsx`.
- Edited: `src/components/app/Paywall.tsx` (button starts real checkout), `src/lib/access.ts` / `use-access.ts` (unlock recorded only after verification).
- After deploy I'll give you the exact webhook URL to paste into Stripe, then you add the signing secret.

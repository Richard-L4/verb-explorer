# Fix: payment success page on verb-wise.richard-wells.com

## What I measured just now (live, both domains)

| Check | verb-wise-flashcards.lovable.app | verb-wise.richard-wells.com |
|---|---|---|
| `/api/public/env-check` build stamp | `env-check-v1` | `env-check-v1` |
| Stripe secret resolved | **true** (test-mode key) | **false** |
| Webhook secret resolved | **true** | **false** |
| Supabase server keys resolved | **true** | **false** |

Domain check on this project: **no custom domains are connected**. The project is published.

## Root cause

`verb-wise.richard-wells.com` is not served by this Lovable project. It is a separate Cloudflare Worker/Pages deployment of the same code with none of the secrets bound. On that host every server function that touches Stripe fails:

- Checkout can't create a session.
- `/unlock/success` calls `confirmCheckout`, which throws on every retry, so it silently falls through to the "Stripe hasn't confirmed this payment yet" state — that's the "no success page" you're seeing.
- The Stripe webhook returns 503, so nothing is recorded in the database either.

Publishing again will never change this, because publishing only updates the Lovable-hosted deployment.

## The fix (no code change needed)

1. Connect `verb-wise.richard-wells.com` to this project: Project Settings → Domains → Add custom domain, then update the DNS record at your registrar to the value Lovable shows. This retires the separate Worker as the origin and the domain starts serving the same deployment that already has all secrets bound.
2. After the domain shows Connected, re-check `https://verb-wise.richard-wells.com/api/public/env-check` — all six values should read `true` and `stripeKeyMode` should match the Lovable host.
3. Point the Stripe webhook endpoint at the domain you want to keep as canonical (`.../api/public/stripe-webhook`) and confirm a test event returns 200.
4. Run one end-to-end test purchase and confirm `/unlock/success` reaches the "You're unlocked" state.

Alternative, if you want to keep your own Cloudflare Worker as the origin: bind `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VERBWISE_SUPABASE_URL` and `VERBWISE_SUPABASE_SERVICE_ROLE_KEY` as secrets on that Worker and redeploy it from current code. This keeps two deployments to maintain, so option 1 is the one I recommend.

## Small code improvements I'd make alongside

- `src/routes/unlock_.success.tsx`: surface the real failure instead of masking it. If every `confirmCheckout` attempt throws (as opposed to returning `paid: false`), show an explicit error state with a retry button rather than the "not confirmed yet" wording, so a misconfigured host is obvious immediately.
- Keep `/api/public/env-check` until the domain is verified working, then remove it in a follow-up so the diagnostic surface isn't permanent.

## Notes

- The currently bound Stripe key is a **test-mode** key (`stripeKeyMode: "test"`), so real card payments will not go through on the Lovable host either until you swap in the live key. Worth deciding before the end-to-end test.

# Fix: completed Checkout Session shows "Stripe hasn't confirmed this payment yet"

## Root cause — confirmed in the live server logs, not inferred

Production logs for `verb-wise.richard-wells.com` at 10:18–10:20 today show the exact sequence:

```text
10:18:54 [log]   [checkout] session created cs_test_a1afh8kw6yjMpVBTpik5baeBkEuotyMEpGyrJh7ZNZYxbEOZAFL9iPrTwG
10:20:06 [req]   GET /unlock/success?session_id=...
10:20:08 [error] [stripe] Failed to record purchase: Could not find the 'marketing_consent' column of 'purchases' in the schema cache
10:20:09 [error] (same)
10:20:13 [error] (same)
10:20:18 [error] (same)
```

Four errors = the four retry attempts in `/unlock/success`, then the UI falls through to the "pending" message.

Environment is not the problem: `/api/public/env-check` on the custom domain now returns `true` for `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and both Supabase server keys, with `stripeKeyMode: "test"` — matching the `cs_test_` session.

The actual chain:

1. `confirmCheckout` calls `purchaseExists(sessionId)` — false, because the webhook insert failed for the same reason.
2. It retrieves the session from Stripe — `payment_status` is `paid`, correctly.
3. It calls `recordPurchase(session)`, whose insert into `purchases` includes `marketing_consent`. That column does not exist in the live `purchases` table, so PostgREST rejects the insert and `recordPurchase` rethrows.
4. The thrown error propagates out of `confirmCheckout`, so the success page's `catch { /* keep retrying */ }` swallows it and `result.paid` is never read. After four attempts it shows "pending".

So a genuinely paid customer is denied access because of a database bookkeeping failure on an optional field.

## The fix

**1. Add the missing column to the live database.** The `purchases` table needs `marketing_consent boolean` (nullable). This database is your own external Supabase project (`VERBWISE_SUPABASE_*`), which I cannot migrate from here, so you'll run this once in its SQL editor:

```sql
alter table public.purchases
  add column if not exists marketing_consent boolean;
```

I'll confirm afterwards by re-running the confirm flow for the session above.

**2. Never let bookkeeping block entitlement** (`src/lib/checkout.functions.ts`). Restructure `confirmCheckout` so that once Stripe reports `payment_status === "paid"`, the function returns `{ paid: true }` regardless of whether `recordPurchase` succeeds. The recording call gets wrapped so a database failure is logged as `recorded: false` and reported, not thrown. Payment truth comes from Stripe; the database row is a record of it.

**3. Make the purchase insert tolerant of an absent optional column** (`src/lib/payments.server.ts`). If the insert fails with a "could not find the '<name>' column" error, retry once without the optional fields (`marketing_consent`) and log a clear warning naming the missing column. Consent is still captured in `communication_preferences` and in Stripe metadata, so nothing is lost. This also protects the webhook path, which is failing identically today.

**4. Stop hiding the real error on the success page** (`src/routes/unlock_.success.tsx`). Keep the retry loop, but capture the last error message and, when every attempt fails, show an explicit error state (with the reason and a retry button) instead of the misleading "Stripe hasn't confirmed this payment yet". Retain the current "pending" wording only for the genuine case where Stripe returns `paid: false`.

**5. Diagnostics.** Add a `[confirm]` log line recording session id, `payment_status`, and whether recording succeeded, so this flow is traceable in future without guesswork. No secret or card data is logged.

## Verification

1. Apply the SQL above.
2. Reload `https://verb-wise.richard-wells.com/unlock/success?session_id=cs_test_a1afh8kw6yjMpVBTpik5baeBkEuotyMEpGyrJh7ZNZYxbEOZAFL9iPrTwG` — it should reach "You're unlocked".
3. Check the logs show `[confirm] ... recorded=true` and no `Failed to record purchase`.
4. Confirm a row exists in `purchases` for that session id.

## Notes

- The live Stripe key currently bound is a **test** key, so this is a sandbox purchase. Swapping to the live key is a separate decision.
- The `/api/public/env-check` endpoint stays until this is verified, then I'll remove it in a follow-up.

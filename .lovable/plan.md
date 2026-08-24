# Fix: completed Checkout Session shows "Stripe hasn't confirmed this payment yet"

## What the logs show now (after you added `marketing_consent`)

The column fix worked — that error stopped. A second, different error took its place at 10:38:

```text
10:38:43 [error] [stripe] Failed to record purchase: Could not find the 'stripe_checkout_session_id' column of 'purchases' in the schema cache
10:38:45 (same)
10:38:48 (same)
10:38:54 (same)
```

Four errors again = the four retry attempts on `/unlock/success`, then the misleading "pending" message. Earlier `marketing_consent` errors at 10:20 and 10:31 no longer appear after 10:31.

The live `purchases` table is missing **two** columns the code writes, and they are being discovered one at a time because PostgREST reports only the first unknown column per insert.

`stripe_checkout_session_id` is worse than a bookkeeping field: it is the idempotency key. `purchaseExists()` filters on it, so that lookup is also failing today, which is why the webhook and the confirm path both fall over.

## The fix

**1. Add the second missing column.** Run this once in your Supabase SQL editor:

```sql
alter table public.purchases
  add column if not exists stripe_checkout_session_id text;

create unique index if not exists purchases_stripe_checkout_session_id_key
  on public.purchases (stripe_checkout_session_id);
```

The unique index makes retries genuinely idempotent rather than relying on a read-then-insert race.

**2. Verify the whole shape up front, not one column per attempt.** Before making further changes I'll have the code log the full PostgREST error object (message, details, hint) rather than just `error.message`, so any remaining schema mismatch in `purchases`, `customers`, `prices` or `communication_preferences` surfaces in one pass instead of four more round trips.



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

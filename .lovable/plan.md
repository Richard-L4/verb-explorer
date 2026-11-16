# Plan: Lifetime price to £19.99 with new product description

## 1. Audit (current state, already at £14.99 in code, unpublished)
Price text and wording appear in:
- `src/lib/access.ts` — `UNLOCK_PRICE = "£14.99"`, feeding Paywall, Settings and Trial banner automatically
- `src/routes/unlock.tsx` — page title, description, social preview text
- `src/components/app/Paywall.tsx` — heading "Unlock Verb Wise — {price}" and "One-off payment. Yours permanently..." line (the main purchase box, also shown on locked pages)
- `src/components/app/TrialBanner.tsx` — "£14.99 once. Lifetime access. No subscription."
- `src/components/app/PromoPopup.tsx` — "Then £14.99. Hundreds of examples. A lifetime of better Spanish."
- `src/routes/terms.tsx` — description and "A single one-off payment of £14.99..."
- `src/routes/settings.tsx` — uses `{price}`, changes automatically
- Homepage: no price shown; no change
- Checkout / backend: `src/lib/stripe-mode.server.ts` (live and test price IDs, list of accepted older prices)
- Payment check / webhook: price-agnostic apart from the accepted price list; no change

## 2. Stripe
- You create two new one-time GBP prices of £19.99 (live and test), on the same Verb Wise product.
- Keep the £4.99 and £14.99 prices active-or-archived in Stripe — archiving is safe; deleting is not needed.
- The new IDs become the current prices; both £14.99 IDs and both £4.99 IDs move to the "still accepted" list so open checkouts and earlier purchases keep working.

## 3. Application changes
- `stripe-mode.server.ts`: new current IDs; legacy lists = £4.99 + £14.99 IDs per mode.
- `access.ts`: `UNLOCK_PRICE = "£19.99"`.
- `Paywall.tsx`: show the approved description — "£19.99", "One payment. Hundreds of examples. A lifetime of better Spanish.", the six bullet points, "£19.99 one-off payment – lifetime access to the Verb Wise app. No subscription.", and the small muted NB about future membership/community features. Existing styling, consent box and buy button kept.
- `unlock.tsx`: page/social text to £19.99.
- `TrialBanner.tsx`: "£19.99 once. Lifetime access. No subscription."
- `PromoPopup.tsx`: "Then £19.99. Hundreds of examples. A lifetime of better Spanish."
- `terms.tsx`: £19.99, plus one sentence that future membership and community features are separate and not included.
- Lifetime access: unchanged — any accepted paid session grants the existing permanent pass.
- Seven-day trial, quizzes, verbs, sayings, subjunctive: untouched.

## 4. Database
- No schema or function change is needed for access: unlocking and Restore by email do not depend on the price amount.
- One thing to check (I cannot read your database from here): purchases record a link to a `prices` row matched by Stripe price ID. If no row exists for the new price, the purchase is still saved with that link empty, provided the column allows empty. Recommendation: you confirm in Supabase whether `purchases.price_id` allows null and, if you want tidy records, add `prices` rows for the £14.99/£19.99 IDs yourself. This applies equally to the unpublished £14.99 change.

## 5. Tests
- Update `stripe-mode.test.ts`: new £19.99 IDs used for new checkouts; £14.99 and £4.99 still accepted in their own mode; unrelated and cross-mode prices rejected.
- Update `access.test.ts` and `TrialBanner.test.tsx` to £19.99.
- Full suite (currently 318) must pass.
- Browser check: Unlock page, Paywall on a locked page, trial banner, popup, Terms show £19.99 consistently; mobile has no overflow.
- Preview test checkout with a Stripe test card, then success-page unlock and Restore by email (manual, needs you to try on preview).
- Webhook delivery is not tested by me unless a test webhook secret is set.

## 6. Deployment sequence
1. You create the two £19.99 prices and send the IDs.
2. I implement and run all tests and checks.
3. You run one test-card checkout on the preview.
4. You publish; production uses only the live key and live £19.99 price.

## 7. Risks
- Publishing before creating the live £19.99 price would break checkout — IDs are required first.
- Missing `prices` row (see section 4) — verify the column allows empty.
- Customers mid-checkout at the old price still unlock (accepted list).

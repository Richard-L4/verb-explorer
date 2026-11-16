# Raise lifetime access from £4.99 to £14.99

## What changes for customers
- Checkout charges £14.99 once, for lifetime access. Trial, creator access, restore, quizzes, verbs and sayings are unchanged.
- Every displayed price says £14.99: Unlock page (title, description, share text), Terms page, trial banner ("£14.99 once. Lifetime access. No subscription."), and the popup line, which becomes "Then £14.99. Hundreds of examples. A lifetime of better Spanish."
- Existing £4.99 buyers keep access: their purchases are already stored and restore by email reads those records, not the price.

## What you need to supply
Two new Stripe prices, £14.99 GBP, one-time, on the existing Verb Wise product:
- a live price ID, and
- a test (sandbox) price ID, so the full flow can be tested first.
I will not invent IDs. I will wait for both before changing checkout.

## Technical details
- `src/lib/payments.server.ts`: `VERB_WISE_LIVE_PRICE_ID` / `VERB_WISE_TEST_PRICE_ID` become the new £14.99 IDs (only place new checkouts get their price). The old £4.99 IDs are kept as legacy accepted IDs in `fetchVerifiedVerbWiseSession`, so a £4.99 checkout already open at release time still unlocks; new sessions always use £14.99. The GBP/paid/complete/single-item checks stay.
- `src/lib/access.ts`: `UNLOCK_PRICE = "£14.99"` (single source for in-app displays); `TrialBanner.tsx` and `PromoPopup.tsx` use it instead of hard-coded text; `unlock.tsx` and `terms.tsx` head/body text updated.
- No database migration, no new secrets, webhook unchanged (it already re-verifies through the same function).
- Tests: update the `£4.99` assertion in `access.test.ts` and the banner fixture to £14.99; add tests that the new price ID is accepted, the legacy ID is still accepted, and an unrelated price is rejected. Full suite must pass.
- Verification: search confirms no remaining "£4.99" in customer text; browser check of Unlock, banner, popup on desktop and phone; a test-mode checkout with a Stripe test card confirms a £14.99 charge unlocks, and an abandoned checkout does not.

## Release steps after approval
Publish after the test-mode checkout succeeds; no other deployment step is needed.

# Update the promotional tagline

## Where the wording appears
A search of the whole project found the exact phrase "Then just £4.99 — less than a coffee" in only one place:
- `src/components/app/PromoPopup.tsx` (line 104), inside the promotional popup.

## Change
Replace that text with: "Then £19.99. Hundreds of examples. A lifetime of better Spanish."
The surrounding element, classes and layout stay exactly as they are. Nothing else is edited.

## Important: price mismatch
The actual price is still £4.99 everywhere else: the checkout amount, the Unlock page, the Terms page, the trial banner ("£4.99 once. Lifetime access.") and the stored price value. After this change the popup would advertise £19.99 while the purchase charges £4.99. As instructed, those are left unchanged. If the price itself is meant to rise, that needs a separate change (including the Stripe price).

## Verification
- Search again to confirm the old phrase appears nowhere and the new phrase appears once.
- Run the full test suite and report results.
- Open the popup in the browser (desktop and phone width) to confirm the new line displays without layout changes.

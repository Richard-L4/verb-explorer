# "Less than a coffee" purchase messaging

## 1. Trial-ended banner (`TrialBanner.tsx`)
- Only when the message is the expired one ("Your full-access trial has ended."), add beneath it:
  - **Less than a coffee** (bold, sentence case, green accent text on a pale green pill)
  - "£4.99 once. Lifetime access. No subscription." (smaller supporting text)
- Countdown banners (5/3/2/1 days) unchanged.
- "Buy now — £4.99" button, link to /unlock, banner background, corners and spacing kept; desktop stays one row (text block left, button right), mobile stacks with no overflow.

## 2. 7-day popup (`PromoPopup.tsx`)
- Replace the "Then £4.99 for unlimited lifetime access." line with a subtle pale-green box (existing primary tokens) containing:
  - **Then just £4.99 — less than a coffee** (bold)
  - "Unlimited lifetime access. No subscription."
- Remove the now-duplicate "No subscription. No recurring charges." footnote, so the message isn't repeated. Heading, intro line, "Limited time" badge, × button and show/close behaviour unchanged.

## Unchanged
Price, trial length, Stripe checkout, access rules, analytics events, popup timing/dismissal.

## Acceptance checks
- Existing test suite passes, including TrialBanner tests.
- Expired-trial banner shows the new message; 5/3/2/1-day countdown banners unchanged.
- Popup shows the price message once, without the redundant footnote.
- At 390px: price message and button fit with no horizontal scrolling. At 1280px: trial banner stays a single row.
- Stripe checkout, access rules, analytics and popup timing unchanged.

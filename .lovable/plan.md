# Trial reminders, Buy now, and creator-only testing controls

Smallest-change update to the existing trial/purchase/creator logic. No redesign, no new payment system, no new authentication.

## 1. Creator mode stays as-is

The existing `?creator=<value>` URL parameter remains the only way to enable creator mode. No login screen, no password field, no change to how the flag is stored or recognised. The value is never rendered, logged or hinted at in the UI.

## 2. Settings: developer controls become creator-only

"End trial now (testing)" and "Reset purchase and trial (testing)" move into a small "Developer / Testing" section that is rendered **only** when creator mode is active (conditional render, not CSS hiding). Normal and incognito users get a clean Access panel with no trace of them.

Renames:
- "End trial now (testing)" -> "End trial now"
- "Reset purchase and trial (testing)" -> "Reset test state"

Behaviour is unchanged: both only touch local trial/unlock state in this browser. Neither creates a paid entitlement, and neither is wired to the purchase flow.

## 3. Purchase available during the trial

Add a `/unlock` route that renders the existing `Paywall` component (same consent checkbox, same unlock call). This is a page for the already-built flow, not a second payment system. If the user already has full access via purchase, the page shows the unlocked confirmation instead.

The Settings Access panel gains a "Buy now — £4.99" link to `/unlock` while the user is in trial or post-trial and not yet unlocked.

## 4. Trial countdown banner

A new `TrialBanner` component renders inside the app shell, directly under the header and above page content, so it never covers cards, navigation or learning content.

It appears only when the trial is active, the user has not purchased, creator mode is off, and days remaining is 7, 3, 2 or 1:

- 7 days left in your full-access trial.
- 3 days left in your full-access trial.
- 2 days left in your full-access trial.
- Your full-access trial ends tomorrow.

Each banner includes a single, obvious "Buy now — £4.99" button linking into the existing purchase flow at `/unlock`. Styling reuses the existing card/pill language (soft surface, hairline border, green primary CTA) so it reads as part of the app rather than an ad.

Because the message is derived from the current days-remaining value, it renders once per page, updates automatically as the trial progresses, and never stacks duplicates.

## 5. Trial expiry

Unchanged: first 10 cards free, everything else paywalled by the existing `Paywall`. When the trial has ended and nothing is purchased, the same banner slot shows "Your full-access trial has ended." with the same "Buy now — £4.99" CTA.

## Technical detail

- `src/components/app/TrialBanner.tsx` (new): reads `useAccess()`, returns `null` unless a reminder threshold or expiry applies; renders text plus a `Link to="/unlock"` CTA.
- `src/components/app/AppShell.tsx`: render `<TrialBanner />` at the top of `<main>`. Nothing else touched.
- `src/routes/unlock.tsx` (new): route with its own head metadata; renders `Paywall` or an unlocked confirmation.
- `src/routes/settings.tsx`: wrap the two testing buttons in a creator-gated "Developer / Testing" block with the new labels; add the customer "Buy now — £4.99" link in the Access panel.
- `src/lib/access.ts` and `src/hooks/use-access.ts`: unchanged except, if needed, exporting the existing days-left value already available via `trialDaysLeft`.

## Verification

Playwright run covering: clean browser sees no developer controls; `?creator=wrong` exposes nothing; the correct creator param enables the Developer / Testing section; End trial now produces the post-trial state; Reset test state restores a fresh 14-day trial; trial start dates seeded for 7/3/2/1 days remaining each render the right banner and CTA; the CTA reaches the paywall and unlock grants access; expired-and-unpurchased shows the free-tier rules unchanged.

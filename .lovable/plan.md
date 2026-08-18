# Legal pages, footer and £4.99 unlock flow

Adds the pricing/paywall experience and the three legal pages, with a simulated purchase (no real payment provider yet).

## Access rules

- A 14-day trial starts the first time the app is opened in a browser (start date saved locally).
- During the trial every verb and saying card is open.
- After 14 days, only the first 10 verb cards stay free. All other verb cards and all sayings show a paywall.
- Unlocking is permanent for that browser (saved locally, alongside existing progress).
- Settings gets a small "Access" panel showing trial days left / unlocked status, plus a way to reset the simulated purchase for testing.

## Paywall and checkout

Locked cards show a lock badge in the grid; opening one shows a paywall panel instead of the card content:

- Heading: "Unlock Verb Wise — £4.99"
- Subtext: "One-off payment. Yours permanently. No subscription."
- Required checkbox: "I agree that access to the digital content begins immediately and acknowledge that I lose my 14-day right to cancel once access begins."
- Button: "Pay £4.99 and Unlock" — disabled until the checkbox is ticked.
- Links to the Refund Policy and Terms of Use beneath.

Because payments are UI-only for now, pressing the button records the unlock locally and shows a short confirmation. A clear note in the plan-level code marks where the real Stripe call will slot in later.

## Legal pages

Three new pages, plain readable prose, short paragraphs, in the existing card styling with their own page titles and descriptions:

- `/privacy` — Privacy Policy: controller Richard Wells (UK); data collected (account email if sign-in is added, progress/favourites stored locally, no third-party advertising); no personal data sold; UK GDPR basis of legitimate interest / contract performance; functional cookies only; rights of access, rectification and erasure via [contact email]; retention — progress lives in the browser, no server-side personal data beyond account and purchase records.
- `/terms` — Terms of Use: service by Richard Wells, UK; educational Spanish content; free tier of 10 cards; one-off £4.99 unlock for permanent access; personal, non-commercial, non-transferable licence; no reproduction or redistribution; provided as-is with reasonable efforts to stay available; governed by the law of England and Wales.
- `/refunds` — Refund Policy: digital content supplied immediately; checkout consent waives the 14-day cancellation right under the Consumer Contracts Regulations 2013; refunds not offered as a matter of course once access is granted; Consumer Rights Act 2015 rights unaffected — faulty or misdescribed content can be raised at [contact email]; EU/EEA customers can contact us with questions.

Every place needing an address stays as a literal `[contact email]` placeholder.

## Footer

The existing footer line is replaced on every page with a minimal footer:

- "© 2026 Richard Wells"
- Privacy Policy · Terms of Use · Refund Policy

These are router links, not anchors, and remain readable on the dark slate background.

## Technical notes

- Access state (trial start, unlocked flag) is added to `src/lib/progress.ts` under the existing storage key pattern and exposed through `use-learner`, so it hydrates the same way and never causes SSR mismatch (locked state resolves after hydration).
- Gating is applied in `CardGrid` / `SayingGrid` tiles and in the `card.$cardId` / `saying.$sayingId` routes.
- New route files: `src/routes/privacy.tsx`, `src/routes/terms.tsx`, `src/routes/refunds.tsx`; new components: `Paywall.tsx` and a small `SiteFooter.tsx` used by `AppShell`.
- Existing verb and saying data, styling and progress behaviour are untouched.

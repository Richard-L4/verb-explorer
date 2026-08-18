# Buy Now confirmation step: why mobile behaves differently

## What the investigation found

The difference is not mobile-specific. Nothing in the Buy Now path is viewport-conditional:

- The "Buy now" control in the trial banner is a plain router `Link` to `/unlock` — no tap/click handler, no touch-specific code path.
- `Paywall` (the confirmation screen with the 14-day consent checkbox) has no responsive conditions, no `useIsMobile`, and no CSS that hides it on small screens.
- The only place `unlock()` is called is the Paywall's own Pay button, which is disabled until the checkbox is ticked.

The real cause is a **state condition** in `src/routes/unlock.tsx`. That route renders:

```text
unlocked || creator || fullAccess  ->  "You have full access" screen
otherwise                          ->  <Paywall /> (checkbox + Pay)
```

`fullAccess` is true whenever the trial is still running. So:

- Desktop (creator device, expired-state preview active): `fullAccess` is false, so the Paywall with the checkbox appears — the flow looks correct.
- Physical mobile (no creator mode, trial still active): `fullAccess` is true, so `/unlock` skips the Paywall and shows the "You have full access / Browse all cards" screen. Cards 11+ already read as open because the trial itself is open, which is what looks like "Buy Now instantly unlocked everything".

So on mobile the purchase never actually happened: no confirmation screen was rendered and dismissed, and `unlocked` was never set to true. The route just decided the confirmation screen was unnecessary.

## The fix

One change, in `src/routes/unlock.tsx`:

- Show the "You have full access" panel only when the user genuinely owns access outside the trial: `unlocked || creator`.
- In every other case — including an active trial — render `<Paywall />`, so the confirmation screen and the 14-day checkbox always appear when the user chooses to buy.
- When the trial is still running, add a short line above the Paywall noting that the trial is active and days remain, so buying during the trial is a deliberate choice rather than a confusing prompt.

No changes to payment architecture, `unlock()`, trial expiry, creator preview, Reset Test State, padlocks, or the banner logic.

## Verification

Reproduce and confirm at both a 390px mobile viewport (touch emulation) and desktop:

1. Trial active, non-creator: tap Buy now -> Paywall with checkbox appears; cards unchanged.
2. Pay button stays disabled until the checkbox is ticked.
3. Completing the step sets `unlocked`, cards 11+ open, trial banner disappears.
4. Reload keeps the purchased state, and `/unlock` then shows the "You have full access" panel.
5. Trial-expired state and creator mode behave exactly as before.

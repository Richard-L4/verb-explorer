# Trial banner vs purchase state — findings and fix

## What I traced

**There is no Stripe or Supabase in this project.** Nothing under `src/` references Stripe, a payments provider, or a backend. The purchase is entirely local and simulated: `Paywall` calls `unlock()`, which writes `unlocked: true` into the `verbo.access.v1` localStorage record. That is the one and only entitlement state, and it is what `isLocked()` reads to open cards 11+. So there is currently one flow, not two — a real Stripe path does not exist yet and cannot be compared.

**Real (non-creator) users are not affected.** For a normal user, `unlock()` sets `unlocked: true`, `TrialBanner` returns `null` on `unlocked`, cards 11+ open, and the value persists across refresh because it is read back from localStorage on hydrate. The countdown disappears immediately and stays gone.

**The bug is confined to creator preview mode.** In `TrialBanner`, the banner-preview branch is evaluated *before* the `if (creator || unlocked) return null` guard. So while a creator preview (7/3/2/1/Expired) is active, the banner keeps rendering the simulated countdown even after Buy Now sets `unlocked: true`. That is exactly the symptom: cards unlock, banner stays.

**A second, related inconsistency in the same area:** in `use-access.ts`, the `"expired"` preview forces `unlocked: false` and makes `isLocked()` lock cards 11+ regardless of a real unlock. So if a creator buys while the Expired preview is on, the purchase is visually ignored. The simulation should override the *trial clock*, never the *purchase*.

## The fix

Purchase always wins over trial simulation. Two small logic changes, no new state and no new system:

1. `src/hooks/use-access.ts` — treat the simulated expiry as a trial-clock override only: apply `simulatedExpiry` to `inTrial`, `trialDaysLeft` and `fullAccess` only when the user is not actually unlocked. `state.unlocked` is reported as-is, and `isLocked()` returns `false` whenever `state.unlocked` (or `creator`) is true, before the simulated-expiry check.

2. `src/components/app/TrialBanner.tsx` — move the `unlocked` guard above the preview branch, so an actual purchase hides the banner even while a preview is active. Creator preview with no purchase behaves exactly as it does today (that is the point of the preview), and the `creator` early-return stays only in the non-preview path.

Nothing else changes: real trial expiry, the Expired preview for an unpurchased creator, Reset Test State (which already clears the preview), free cards 1–10, and padlocked-but-visible cards 11+ all keep their current behaviour.

## Verification

Browser run covering: active trial (countdown shown, all cards open); creator Buy Now with a 3-day preview active (cards open, banner gone); refresh (still unlocked, still no banner); creator Buy Now with the Expired preview active (cards 11+ open, banner gone); normal-user Buy Now from `/unlock`; Reset Test State (fresh 14-day trial, preview cleared, banner logic back to real state); expired trial without purchase (cards 1–10 free, 11+ visible and padlocked, ended-banner shown).

## Note on the real payment path

When a real Stripe purchase is added later, it must set the same single entitlement (`unlocked`), ideally server-verified, rather than introduce a parallel paid flag — otherwise the same class of divergence reappears. That work is out of scope here.

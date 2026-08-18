# Fix trial expiry, reset test state and banner position

## What I found

Checked the live app in a browser with a genuinely expired trial (creator flag off):

- Browse showed all 43 cards, 33 of them with the "Locked" badge — so the underlying locking logic already works for a real expired trial.
- The mismatch comes from the creator-only **Preview trial banner** control. It changes only the banner text; it does not simulate the entitlement, so with "Expired" selected the banner says the trial has ended while every card stays fully open and unpadlocked.
- **Reset test state** writes a fresh trial start, but it never clears the banner-preview override. So after clicking it the "Your full-access trial has ended." banner stays on screen and the state looks unchanged, both before and after refresh.
- On Home the banner sits ~67px below the nav but only ~4px above the Verbs block, so it looks glued to the hero.

## Changes

1. **Make the expired preview behave like a real expired trial (creator only)**
   - The creator banner preview becomes a simulated trial state, not just banner text: when "Expired" is selected, cards 11+ (and sayings) lock exactly as in a real expiry; when a day count is selected, full access applies.
   - It still never touches the stored trial start date or purchase state — clearing the preview returns the browser to its true entitlement.
   - The lock treatment on tiles gains a clear padlock so the locked state reads at a glance (same styling language, no design change).

2. **Reset test state**
   - Clears the banner-preview override alongside restarting the trial clock, and clears any simulated expiry.
   - Writes the fresh trial start to localStorage so the state survives a refresh.
   - Result after clicking: banner disappears, all cards unlocked, and it stays that way after reload.

3. **Banner spacing on Home**
   - Equalise the vertical gap above and below the trial banner so it is visually centred between the nav bar and the Verbs block, at all breakpoints. Banner styling, size, text and behaviour unchanged.

## Verification

Playwright run covering: active trial (all cards open, no banner), real expired trial (cards 1–10 open, 11+ visible with padlock), creator "Expired" preview (same padlocked view), reset test state (banner gone, full access), plus a reload after each to confirm persistence. Home spacing checked at mobile, tablet and desktop widths.

## Technical notes

Files touched: `src/lib/access.ts` (reset clears preview), `src/hooks/use-access.ts` (preview feeds `isLocked` for creators only), `src/components/app/VerbCardTile.tsx` / `SayingCardTile.tsx` (padlock affordance), `src/components/app/TrialBanner.tsx` (symmetric spacing). No new trial or reset system, no data, routing, palette or typography changes.

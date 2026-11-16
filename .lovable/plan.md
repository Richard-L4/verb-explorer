# Navigation: restore Settings, add Buy It Now

## What I found so far
- Settings is still listed in the shared menu data, linking to /settings, so it was not deleted.
- The desktop menu sits in one non-wrapping row inside a fixed-width header, alongside the logo. With nine links plus the Random menu, the row is likely too wide, so the last item (Settings) is pushed off the visible area. This cause is not yet confirmed; step 1 confirms it.

## Steps
1. Screenshot the preview at desktop widths (1024, 1280, 1536) and on a phone with the menu open, and measure whether Settings is clipped or off-screen. If the cause turns out different, fix that cause instead and tell you.
2. Settings fix (menu layout only): widen the header container on large screens and/or let the menu scroll or tighten spacing so every item, including Settings, stays visible. No change to the Settings page.
3. Add "Buy It Now" linking to the existing /unlock page, styled as a highlighted button so it stands out, in both the desktop and phone menus. Same shared menu list, so both stay in sync.
4. Check: screenshots at desktop and phone sizes showing both items; click each and confirm /settings and /unlock open, and that /unlock still shows £14.99. Run the full test suite.

## Boundaries
No changes to Stripe, prices, checkout, trial, access rules, database, the Settings page, the Unlock page or other menu items. Nothing published.

## Technical details
- Files: `src/components/app/nav-items.ts` (add `/unlock` entry, plus a highlight flag), `src/components/app/AppShell.tsx` (header width / nav overflow, highlight styling via existing tokens).

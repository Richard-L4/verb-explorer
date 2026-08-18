# Preview trial banner (creator-only)

A visual-only override so the creator can see each trial-banner state without touching the real trial clock or purchase state.

## Behaviour

- In Settings, inside the existing Developer / Testing section (creator mode only), add a small "Preview trial banner" row of buttons: 7 days, 3 days, 2 days, 1 day, Expired, and Clear preview.
- Choosing an option makes the banner render that state everywhere in the app immediately.
- The active option is highlighted, with a short note that this is display-only.
- "Clear preview" returns the banner to the real trial state.
- Nothing about the real trial start date, purchase/unlock state, card locking, or paywall changes while a preview is active.
- Normal users (including incognito) never render this section — it stays inside the creator-gated block, not CSS-hidden.

## Technical detail

1. `src/lib/access.ts`
   - Add a separate, in-memory + `localStorage` preview value under its own key (e.g. `verbo.banner-preview.v1`), typed `7 | 3 | 2 | 1 | "expired" | null`.
   - It lives outside `AccessState` so entitlement logic (`trialDaysLeft`, `unlock`, `isLocked`) is untouched.
   - Export `getBannerPreview()`, `setBannerPreview(value)`, and reuse the existing listener set so subscribers re-render.
   - `resetAccess()` / `endTrial()` leave it alone; only "Clear preview" clears it.

2. `src/hooks/use-access.ts`
   - Expose `bannerPreview` and `setBannerPreview` from the same `useSyncExternalStore` snapshot (store shape extended to carry the preview field, or a second small store — whichever keeps the existing snapshot stable).
   - Gate reads so the preview is only honoured when `creator` is true; a stale key in a non-creator browser is ignored.

3. `src/components/app/TrialBanner.tsx`
   - When a preview is active (and creator), derive the message from the preview value instead of the real days-left, using the existing `reminderFor` logic, and render normally including the "Buy now — £4.99" CTA.
   - Add a discreet "preview" tag on the banner so the creator can tell it is simulated.
   - With no preview, current behaviour is unchanged (creator/unlocked return null).

4. `src/routes/settings.tsx`
   - Add the preview button row into the existing creator-only Developer / Testing section, reusing the current pill button styling.

No changes to card content, navigation, legal pages, payment flow, or the `?creator=` mechanism.

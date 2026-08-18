# Creator access flag

A hidden way for the site owner to give any browser permanent full access, bypassing the trial and paywall.

## How it works

- Visiting `/?creator=hilary53` sets a permanent `creator_access: true` flag in the browser's local storage.
- Once set, every card (verbs and sayings) is open forever in that browser — no trial countdown, no paywall.
- The flag persists until it is manually cleared from the browser.
- The Settings "Access" panel shows "Creator mode active" when the flag is set.
- Nothing in the UI links to this URL; it is only known to the creator.

## Technical detail

1. `src/lib/access.ts`
   - Add `creator: boolean` to `AccessState`, read/write it alongside `trialStart` and `unlocked` in the existing `verbo.access.v1` record, and additionally mirror it to a standalone `creator_access` local-storage key set to `true` so the flag is obvious and independently clearable.
   - Read path treats either source as truthy on load.
   - Add `enableCreatorAccess()` which writes the flag once (no-op if already set).
   - `resetAccess()` and `endTrial()` keep the creator flag intact (creator mode is not a testing toggle).

2. Query-param detection
   - In `hydrate()` (browser-only), check `new URLSearchParams(window.location.search).get("creator") === "hilary53"` and enable creator access before the normal trial bootstrap. This runs on any route, so the param works from `/` or anywhere else.

3. `src/hooks/use-access.ts`
   - `isLocked()` returns `false` immediately when `state.creator` is true.
   - Expose `creator` and `fullAccess` including the creator flag.

4. `src/routes/settings.tsx`
   - In the Access panel, when `creator` is true show a "Creator mode active" status line (styled like the existing unlocked state) instead of trial/unlock messaging.

No visible link or button anywhere points to the creator URL.

# Promo Popup — Landing Page / First Entry Logic

## Goal
Rework only the promotional popup's show/dismiss logic: show it on every landing-page visit (3s delay, no auto-hide) until the user has entered the app, then never show it again (persistent across sessions).

## Changes (all inside `src/components/app/PromoPopup.tsx` + where it's rendered)

### 1. Landing-page only
- Render the popup only on the landing route (`/`). Either mount it in `src/routes/index.tsx` instead of `AppShell.tsx`, or keep it in `AppShell` and gate on the current pathname. Chosen: keep it in `AppShell` and check `useLocation()` — minimal diff, no other files touched.

### 2. Persistent "has entered app" flag
- New localStorage key `vw_has_entered_app_v1`.
- Set it when the user's existing navigation takes them into the app — i.e. when the current route becomes anything other than `/` (browse, search, random, card, sayings, favourites, settings, statistics, etc.). This reuses the existing navigation; no new nav mechanism is created.
- Loading `/` does NOT set the flag. Popup appearing, being closed, or the user idling on `/` does NOT set it.

### 3. Popup behaviour on the landing page
- If `vw_has_entered_app_v1` is set → never render.
- Otherwise, on every landing-page load/return/refresh: wait 3 seconds, then show with the existing fade/scale-in.
- No auto-hide: stays until × is pressed (remove the 10s auto-hide timer).
- × closes it immediately for that visit only.
- No sessionStorage dismissal — the old `vw_promo_popup_session_v1` key is simply no longer read or written (visiting any in-app route also clears nothing; the key is abandoned).
- Returning to `/` later (soft navigation or refresh) re-triggers the 3-second timer and the popup again, unless the flag exists.

### 4. Scope guard
- No changes to trial logic, Stripe, analytics, Creator Mode, test-device protection, card locking, other banners, or navigation. Wording, styling, sizes and animations stay exactly as they are.

## Verification
- Typecheck, tests, build.
- Browser check: popup appears ~3s after landing load; stays past 10s; × closes; refresh → appears again; click Start studying → popup gone and never reappears on later `/` visits, even after a fresh page load (flag persisted in localStorage).

# Promotional Popup Plan

## Goal
Add a polished, informational promotional popup to the Verb Wise app that surfaces the 7-day trial and £4.99 lifetime price, without affecting existing trial logic, Stripe, analytics, or any other functionality.

## Implementation

### 1. New component: `src/components/app/PromoPopup.tsx`
- Render a centered modal-like card inside a fixed, semi-transparent backdrop.
- Use Framer Motion `AnimatePresence` for:
  - Enter: fade + scale from `0.95` / `opacity-0` to `1` / `opacity-100`.
  - Exit: fade out.
- Card styling:
  - White background (`bg-white`).
  - Rounded corners matching the app (`rounded-2xl` / `rounded-3xl`).
  - Subtle shadow (`shadow-2xl` plus a soft colored glow using existing `--shadow-glow` tokens if appropriate).
  - Constrained width (`max-w-sm`), comfortable padding (`p-6`), and safe margins on mobile.
  - Never full-screen; leave visible margin around it.
- Typography:
  - Heading: "7 Days Free Trial" in `font-display`, bold, large.
  - Subtext: "Try full access to Verb Wise for 7 days." in muted dark text.
  - Price line: "Then £4.99 for unlimited lifetime access." with "£4.99" and "unlimited lifetime access" emphasized (bold / accent color / gradient-text as appropriate).
- Close button:
  - Small `×` in the top-right corner.
  - Icon button with hover state.
  - Closes the popup immediately and marks it dismissed for the session.

### 2. Show / hide behaviour
- State stored in `sessionStorage` under a single key (e.g. `vw_promo_popup_session_v1`) so it survives client-side navigation but does not persist across browser sessions.
- The popup is considered "shown" once it has actually become visible; the `sessionStorage` dismissed flag is only set at that point, not when the component mounts or when the 3-second timer starts.
- Show timer: 3 seconds after the component mounts, if not already dismissed.
- Auto-hide timer: 5 seconds after it becomes visible, unless the user has already closed it.
- Cleanup timers on unmount to avoid leaks.
- No navigation, no trial mutation, no analytics events, no localStorage mutation.

### 3. Integration in `src/components/app/AppShell.tsx`
- Import and render `<PromoPopup />` once, near the top of the app shell (after `<header>` or inside the outer `<div>`).
- Ensure it sits above all other content (`z-50`) without blocking the header permanently (backdrop is pointer-events-none, card is pointer-events-auto).

### 4. Scope guard
- Do not touch: trial logic, Stripe checkout, analytics, Creator Mode, test-device protection, card locking, navigation, legal pages, or existing banners (`InstallBanner`, `TrialBanner`, `PostStudyPanel`).
- Do not add new dependencies; Framer Motion and Lucide are already available.

## Verification
- Run typecheck, existing tests, and build.
- Visually confirm:
  - Popup appears ~3 seconds after first page load.
  - Auto-hides after ~5 seconds.
  - `×` closes it immediately.
  - After closing or auto-hiding, it does not reappear during the same browser session (soft navigation, refresh, etc.).
  - Looks good on desktop and narrow mobile, does not cover the full screen, text remains readable, and the backdrop keeps the underlying app visible.

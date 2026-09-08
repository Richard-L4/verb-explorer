# Random Cards, Home Screen CTA and optional daily reminders

One feature, built end to end on top of what Verb Wise already has. Nothing in the trial, pricing, Stripe, Creator Mode, test-device protection or existing funnel analytics is touched.

## 1. Random Cards

- New page at `/random`, reached from a button on the home page only (navigation stays as it is).
- Opens straight onto a randomly chosen card — no setup screen, no quiz.
- The card is shown with the same layout, colours and buttons as the normal card page (favourite, learned, examples, notes).
- Only cards the user can actually read are drawn; locked cards are skipped.
- Controls at the bottom, big enough for a thumb:
  - `← Previous` (back through the cards seen this session)
  - `Next: ponerse →` — the next verb's name is shown before they move to it, so they can decide.
- The order is a shuffled run through the deck, so nothing repeats until the whole deck has been seen.

## 2. Counting cards studied

- Each distinct card actually shown in Random Cards is counted once and saved on the device.
- Ordinary browsing elsewhere is not counted.
- The count survives closing and reopening the app.
- It is never sent to the funnel, to the database, or to anyone else.

## 3. Leaving the session

When the user navigates away from Random Cards having studied at least one card, a panel appears at the top of the next page:

> Great! You've studied 7 cards. 🇪🇸
> Be sure to come back soon and keep your Spanish going.

Directly beneath, the main action:

> **Add Verb Wise to your Home Screen**
> Keep Verb Wise just a tap away so you can practise whenever you have a few minutes.

Prominent, first thing on the page, using the existing "Verbs" gradient and the existing card/button styling — no new colours. Clear X to dismiss; the app is fully usable without installing. Nothing interrupts them mid-card.

## 4. Installing

- Where the browser offers it, the button triggers the real install prompt and reacts to accept or dismiss.
- On iPhone/iPad, short instructions instead: tap Share, then Add to Home Screen.
- On desktop without a prompt, the existing bookmark wording.
- Already installed: the CTA never appears.
- Dismissals and installs are remembered so it does not reappear repeatedly.

## 5. Optional daily reminders

Shown only *after* the install step (installed, or the CTA acted on) — never on first arrival:

> Want a little reminder to keep your Spanish going? 🇪🇸
> Allow daily reminders and Verb Wise can remind you to practise each day.
> [✓ Allow daily reminders] [Not now]
> You can turn these off any time in Settings.

No account, no email, no form. Behind the scenes the browser registers silently; the user sees none of the technical wording. Declining, or a blocked permission, means the invitation is not shown again.

Settings gains a simple **Daily reminders — On / Off** switch. Turning it off stops delivery and removes the registration.

## 6. The reminders themselves

- Sent from the server at one fixed time each day (18:00 UK), so they arrive whether or not the app or browser is open.
- Content is genuinely useful and rotates daily, built from the existing verb deck, e.g.
  *Spanish verb of the day 🇪🇸 — Ponerse: to put on / become.*
- Tapping one opens Verb Wise on that card.

## Technical notes

- **Service worker:** the existing `vite-plugin-pwa` (`generateSW`) setup is kept. A small `public/push-sw.js` with `push` and `notificationclick` handlers is pulled in via the Workbox `importScripts` option — no second service worker, no switch to `injectManifest`, and the existing preview/dev registration guards in `src/lib/pwa.ts` are unchanged.
- **Install logic:** reuses `src/lib/install-prompt.ts` (`beforeinstallprompt` capture, `isStandalone`, `isIos`) rather than duplicating it. The existing one-time `InstallBanner` stays as-is; the new CTA uses its own storage key.
- **Push sending:** Cloudflare Workers cannot run the Node `web-push` package, so VAPID signing is done with the platform's own WebCrypto (ES256 JWT + `aes128gcm` payload encryption) in a server-only helper. `VAPID_PUBLIC_KEY` is public; `VAPID_PRIVATE_KEY` and a `REMINDER_CRON_SECRET` are stored as server secrets and never reach the browser.
- **Storage:** a new `push_subscriptions` table (endpoint, the two browser keys, created/last-seen, active flag) delivered as a SQL file to run in the SQL Editor, matching the existing `db/*.sql` pattern — service-role only, RLS on, no anon access. No IP, no personal data. Existing tables are untouched.
- **Registering:** a `createServerFn` validates and stores the registration; there is no public endpoint that lets anyone send a notification.
- **Scheduling:** `pg_cron` + `pg_net` in the existing database calls a server route `/api/public/send-daily-reminders` once a day, authenticated with the shared secret. Gone/expired registrations (404/410) are deactivated automatically so delivery does not retry forever.
- **Local counting:** `localStorage` key `vw_random_studied_v1`, plus keys for CTA dismissal and reminder-invite state. No new analytics events.

## Testing

Random Cards navigation and next-verb label; the count persisting; the message and CTA on exit; install prompt, iOS, desktop and already-installed paths; permission not requested on arrival; allow / not now / denied; a real notification delivered from the server and opening the app; turning reminders off; and a regression pass over trial banners, locked cards, Creator Mode, funnel counts and checkout.

## What you'll need to do

Run the new SQL file, and I'll ask for the two secrets at the right moment. The VAPID key pair I can generate for you.

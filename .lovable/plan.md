# Anonymous trial-funnel tracking

Goal: make the whole funnel countable — app visit, trial started, each reminder seen, trial expired, checkout started, purchase completed — without identifying anyone and without changing existing pricing, trial or paywall behaviour.

## What gets recorded

Nine events, each written once per device (except app visit, which is once per day per device):

| Event | Fired when |
| --- | --- |
| `app_visit` | first page load of the day |
| `trial_started` | the 14-day trial clock is created on first ever visit |
| `reminder_7` / `reminder_3` / `reminder_2` / `reminder_1` | the countdown banner is actually rendered at that day count |
| `trial_expired` | days remaining first reaches 0 without a purchase |
| `checkout_started` | the Stripe Checkout session is created |
| `purchase_completed` | the Stripe webhook records a paid purchase |

Reminder events fire on render, so they measure people who genuinely saw the banner — not just people whose clock passed that day. Each reminder is de-duplicated locally, so a person who opens the app five times on day 3 counts once.

## Anonymous device ID

On first visit the app generates a random UUID (`crypto.randomUUID()`) stored in localStorage. It is not linked to a name, email or IP, and creator-mode devices are excluded from tracking so your own testing does not pollute the numbers. Clearing browser data produces a new ID — the usual limitation of cookie-free analytics, and worth stating in the Privacy Policy.

## Privacy Policy

The Privacy Policy currently says there is no tracking. It gets one honest paragraph: anonymous, aggregate usage events with a random device identifier, no advertising, no profiles, no third parties.

## New database table

One new table in your existing Supabase project, alongside `customers` / `purchases` (no changes to those):

```text
trial_events
  id            uuid primary key
  device_id     text not null
  event         text not null      -- app_visit | trial_started | reminder_7 | ...
  trial_day     int null           -- days remaining at the time, when relevant
  occurred_at   timestamptz default now()
  unique (device_id, event, occurred_on)   -- occurred_on = date, for daily visits
```

Row Level Security on, no `anon` access: writes go only through a server function using the service-role key, so nobody can spam or read the table from the browser. Because I cannot run migrations against this external project, I will give you the exact SQL (table + grants + RLS + unique index) to paste into your Supabase SQL editor. Nothing is written until you run it.

## Reading the numbers

A `/settings` creator-only "Funnel" panel showing one line per event with its distinct-device count, so you can answer "how many people reached the 3-day reminder" directly in the app. It reads through a creator-gated server function; normal visitors never see it.

## Technical detail

- `src/lib/analytics.ts` (new): device ID, localStorage de-dupe set (`verbo.events.v1`), `logEvent(name, day?)` that fires the server function once and never throws into the UI.
- `src/lib/analytics.functions.ts` (new): `logTrialEvent` server fn (zod-validated event name enum) and `getFunnelCounts` creator-gated aggregate read; both use the existing `getSupabaseAdmin()` from `payments.server.ts` loaded inside the handler.
- `src/lib/access.ts`: emit `trial_started` where `trialStart` is first written, and `trial_expired` when days-left first hits 0. Entitlement logic untouched.
- `src/components/app/TrialBanner.tsx`: `useEffect` firing `reminder_<n>` on the message it actually renders; skipped for creator preview mode.
- `src/components/app/AppShell.tsx`: fire `app_visit` once per mount/day.
- `src/lib/checkout.functions.ts`: log `checkout_started` after the session is created.
- `src/lib/payments.server.ts`: log `purchase_completed` inside `recordPurchase`, after the idempotency check so retries don't double-count.
- `src/routes/settings.tsx`: creator-only funnel panel.
- `src/routes/privacy.tsx`: updated tracking wording.

## Verification

Playwright run seeding trial start dates for 7/3/2/1 days and expiry, confirming one row per event per device, that repeat page loads do not duplicate, that creator mode records nothing, and that the funnel panel counts match the table.

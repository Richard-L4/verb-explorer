# Isolate creator/developer testing from production analytics

Goal: make your own testing invisible to `public.trial_events`, without touching the 14-day trial, the paywall, Stripe, or the real-user experience.

## Audit table

| Area | File / function | Current behaviour | Can generate production analytics? | Recommended change |
|---|---|---|---|---|
| Creator detection (entitlement) | `src/lib/access.ts` — `read()`, `enableCreatorAccess()`, `hydrate()` | `creator: true` from `localStorage["creator_access"] === "true"` or `verbo.access.v1.creator`; set by `?creator=hilary53` | No writes itself | Also set a sticky, reset-proof test marker |
| Creator detection (analytics) | `src/lib/analytics.ts` — `isCreatorDevice()` | Returns true if `creator_access === "true"`, `verbo.banner-preview.v1` exists, or `verbo.access.v1.creator === true` | No | Extend to read the new sticky marker |
| Expired-banner preview | `src/lib/access.ts` — `BANNER_PREVIEW_KEY`, `setBannerPreview()` | Preview value in `verbo.banner-preview.v1`; cleared by `resetAccess()` | No (suppressed while set) | Setting any preview should latch the sticky marker permanently |
| Dev control: End trial now | `src/lib/access.ts` — `endTrial()` | Backdates `trialStart` by 15 days | Not while the creator flag is intact — but yes if the flag is later lost | Latch the sticky marker when called |
| Dev control: Reset test state | `src/lib/access.ts` — `resetAccess()` | Clears preview, resets `trialStart`, keeps `creator` | Same as above | Latch the sticky marker; never clear it |
| Reset all progress | `src/routes/settings.tsx` → `useLearner().reset()` | Clears learner data | Indirect | Must not clear the sticky marker |
| App visit | `src/components/app/AppShell.tsx:46` → `logAppVisit()` | Once per UTC day per device | **Yes** | No change (covered centrally) |
| Trial start | `src/lib/access.ts:99` inside `hydrate()` | Logs `trial_started` when `trialStart` is null | **Yes** | No change (covered centrally) |
| Reminders / expiry | `src/components/app/TrialBanner.tsx:48-57` | Logs `reminder_n` / `trial_expired` when banner genuinely renders | **Yes** | No change (covered centrally) |
| Browser choke point | `src/lib/analytics.ts` — `logEvent()` | Suppresses when `isCreatorDevice()`; dedupes in `verbo.events.v1` | Yes, when the flag is absent | Send an explicit `testDevice` flag and a `test-` device-id prefix |
| Checkout started | `src/lib/checkout.functions.ts:58-60` | Server writes `checkout_started` when `deviceId` supplied | **Yes** — bypasses `logEvent()` entirely | Rely on the server-side guard below |
| Checkout caller | `src/components/app/Paywall.tsx:30` | Omits `deviceId` when `isCreatorDevice()` | Yes, when the flag is absent | No change needed once server guards |
| Purchase completed | `src/lib/payments.server.ts:349-353` | Webhook writes `purchase_completed` from Stripe metadata `device_id` | **Yes** — bypasses `logEvent()` | Rely on the server-side guard |
| Public write endpoint | `src/lib/analytics.functions.ts` — `logTrialEvent` | Zod-validates and writes; **no creator/test check** | **Yes** — accepts any schema-valid event | Add test-flag rejection |
| DB writer | `src/lib/analytics.server.ts` — `recordTrialEvent()` | Upserts into `trial_events`; no notion of test | **Yes** | **Single server-side choke point — reject test events here** |

## A. Root cause

Two independent problems.

1. **The only test signal lives in browser storage.** `isCreatorDevice()` reads `creator_access`, `verbo.access.v1` and `verbo.banner-preview.v1`. Testing a fresh trial normally means clearing site data or using a private window — which deletes exactly those keys. From that moment the browser is byte-for-byte indistinguishable from a real first-time user, so `hydrate()` writes `trial_started` and `AppShell` writes `app_visit` immediately. If a backdated/expired state is then produced before `?creator=hilary53` is re-visited, `TrialBanner` writes `trial_expired` seconds later — which matches the two rows you found.

2. **There is no server-side protection at all.** `logTrialEvent` accepts any schema-valid payload, and `checkout_started` and `purchase_completed` never pass through `logEvent()` — they call `recordTrialEvent()` directly on the server. So the browser-side guard is the *only* guard, and it is guarding paths it does not even cover.

Test/creator state currently does **not** survive from browser to server: nothing in the payload says "this is a test", so the server cannot reject anything.

## B. Recommended architecture

Two guards, both central.

- **Guard 1 (browser, existing, hardened).** Keep `logEvent()`'s single early return, but base it on a *sticky test marker* that survives resets, and stamp every outgoing payload with `testDevice: true` plus a `test-` prefixed device id.
- **Guard 2 (server, new, authoritative).** Add the rejection to `recordTrialEvent()` in `analytics.server.ts`. This is the one function every write funnels through — `logTrialEvent`, `createCheckoutSession`, and the Stripe webhook. One condition there covers all three, including direct calls to the public endpoint.

No schema change is required: flagged events are simply never inserted. (Optional variant, if you would rather keep test rows for debugging: add an `is_test boolean not null default false` column and filter it out in `getFunnelCountsFromDb`. Not recommended for now.)

Sticky marker design — latched, never unlatched by app controls:
- Written to `localStorage` **and** a long-lived first-party cookie (`vw_test=1`), so it survives "Reset test state", "Reset all progress", and `localStorage`-only clears.
- Latched by: the `?creator=` parameter, an existing creator flag, `endTrial()`, `resetAccess()`, and any banner preview.
- While latched, the analytics device id is namespaced `test-<uuid>`, so the server can reject on the id alone even if the flag is stripped from the payload.
- Only removable manually (clearing cookies + storage), never by in-app buttons.

## C. Event flow

```text
REAL USER
  page load / banner / checkout
    -> logEvent()            marker absent -> continues
    -> logTrialEvent()       testDevice: false, deviceId "9f2c-..."
    -> recordTrialEvent()    guard passes
    -> INSERT trial_events   row written

CREATOR / TEST USER
  page load / End trial now / Reset test state / expired preview
    -> logEvent()            marker present -> returns false        [blocked #1]
    (or any direct/server path)
    -> recordTrialEvent()    testDevice true OR deviceId "test-..." [blocked #2]
    -> NO row in trial_events
```

## D. Edge cases

- **Normal user** — no marker, no cookie, plain device id: every event written exactly as today.
- **Creator mode** — marker latched on the first `?creator=` visit; blocked in the browser and again on the server.
- **End trial now** — latches the marker before backdating; the resulting `trial_expired` render is blocked twice.
- **Reset test state** — latches the marker and explicitly does **not** clear it; the subsequent `trial_started` from `hydrate()` is blocked.
- **Expired preview** — already suppressed via `isPreview`; now also latches the marker so the state that outlives the preview stays quiet.
- **Stale localStorage** — the cookie survives a `localStorage` clear, so a half-cleared test browser stays marked. A *full* clear (storage + cookies, or a brand-new private window) genuinely resets the browser to a real-user identity; the fix for that is procedural: always re-enter via `/?creator=hilary53`, which latches the marker inside `hydrate()` **before** `trial_started` is logged. That ordering already exists and will be preserved.
- **Page refresh** — unchanged: per-event dedupe in `verbo.events.v1` plus the server's `(device_id, event, occurred_on)` upsert conflict.
- **Direct calls to the analytics endpoint** — `logTrialEvent` stays public, but the server guard drops any payload flagged as test or using a `test-` device id, so replaying test payloads cannot pollute the table.

## E. Implementation plan

1. **`src/lib/analytics.ts`**
   - Add `TEST_DEVICE_KEY` and a `vw_test` cookie helper; add `markTestDevice()` (latch, idempotent) and extend `isCreatorDevice()` (rename intent to `isTestDevice()`, keeping the old export as an alias so `Paywall.tsx` is untouched) to also return true for the marker or cookie.
   - `getDeviceId()`: when the marker is set, generate/return a `test-` prefixed id and store it separately from the real one.
   - `logEvent()`: keep the single early return; include `testDevice: true` in the payload when the marker is set (belt and braces — the event will not be sent anyway).
2. **`src/lib/access.ts`** — call `markTestDevice()` from `enableCreatorAccess()`, `setBannerPreview()` (non-null), `endTrial()`, and `resetAccess()`. No change to `trialDaysLeft()`, `trialActive()`, `TRIAL_DAYS`, or `hydrate()`'s trial-clock behaviour.
3. **`src/lib/analytics.functions.ts`** — add optional `testDevice: z.boolean().optional()` to `eventSchema` and pass it through to `recordTrialEvent`.
4. **`src/lib/analytics.server.ts`** — in `recordTrialEvent()`, before the upsert: `if (input.testDevice === true || input.deviceId.startsWith("test-")) return false;`. Add `testDevice?: boolean` to `TrialEventInput`. This is the authoritative guard and covers the checkout and webhook paths with no edits to those files.
5. **`src/routes/settings.tsx`** — no logic change; optionally show a small "Test device — analytics disabled" note in the Developer/Testing panel so the state is visible.
6. **Tests** (`src/lib/analytics.test.ts`, `src/lib/access.test.ts`) — add cases: marker survives `resetAccess()`; `recordTrialEvent` rejects `testDevice`/`test-` ids; a clean browser still records every event unchanged.

No database migration, no changes to Stripe, Supabase auth, the paywall, or existing rows. Existing analytics data is left exactly as it is.

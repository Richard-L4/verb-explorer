# One-time Creator Funnel baseline adjustment (-10 visits, -10 trial starts)

## What changes

One small, display-only adjustment in `src/lib/analytics.server.ts`, inside the existing `getFunnelCountsFromDb()`:

```ts
const BASELINE_ADJUSTMENT: Partial<Record<AnalyticsEvent, number>> = {
  app_visit: 10,
  trial_started: 10,
};
```

After the distinct-device counts are computed exactly as today, each of these two events is displayed as `max(0, count - adjustment)`. All other events are untouched.

## Why this is a true one-time baseline, not a permanent distortion

The adjustment is a fixed constant (10), not a calculation that grows or re-runs. Once applied, the displayed baseline is simply "current count minus the 10 known test devices" — and from that moment on every new genuine device raises the displayed count one-for-one:

- Database shows 87 visits -> funnel shows 77.
- One new genuine visit -> database 88 -> funnel shows 78. Normal counting resumes.
- Same for trial starts: 67 -> 57 -> 58 after one new genuine start.

The subtraction never changes again; it is the new baseline baked in as a constant.

## What does NOT change

- No rows deleted or modified; `trial_events` and `trial_grants` untouched — the database remains the complete raw record.
- No change to event generation, trial logic, reminders, expiry, device identification, Creator Mode, or production analytics collection.
- The Repeat Visitors section is untouched — it reads raw rows directly and does not apply the adjustment.
- Repeat-visitor totals are not adjusted (per your instruction not to change that section).

## Edge case

If a count is ever below the adjustment (e.g. fewer than 10 devices), the display clamps to 0 rather than going negative.

## Files changed

- `src/lib/analytics.server.ts` only — the baseline constant and a three-line clamp in `getFunnelCountsFromDb()`.

## Verification

- `bunx tsgo --noEmit` and the existing test suite must pass.
- After publish: open the Creator Funnel and confirm visits and trial starts are each 10 lower than the raw database counts, and all other rows are unchanged.

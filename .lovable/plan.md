# Read-only investigation: premature `trial_expired` events

## Scope

No code, database, configuration, or browser state changes.

## Verified paths to cover

1. Trace the sole in-app UI call to `logEvent("trial_expired", { trialDay: 0 })` from `TrialBanner`, through browser-side creator suppression and deduplication, the server function, and the `trial_events` upsert.
2. Document the second write surface: the public `logTrialEvent` server function accepts any schema-valid analytics event, including `trial_expired` with `trialDay: 0`, independently of the trial clock. Distinguish this API capability from calls made by the normal UI.
3. Evaluate each requested state transition against both paths:
   - normal 14-day expiry and page load
   - creator mode
   - Developer / Testing controls
   - End trial now
   - Reset test state
   - expired-banner preview
   - manually altered or stale localStorage
   - automatic trial-day calculation
4. Report every path in a table with file/function, exact trigger, normal-user eligibility, creator/test eligibility, and written `trial_day`.
5. Explain the two supplied rows (`dfea6dca…` at 13:31:01 UTC and `486a9101…` at 13:38:35 UTC) using only evidence the rows and source support. Clearly separate confirmed facts from attribution that cannot be proven without each device's surrounding event rows/browser history.

## Key evidence already established

- `TrialBanner` logs expiry only when its real, non-preview, non-creator banner is rendered, the user is not unlocked, and `inTrial` is false; it explicitly passes `trialDay: 0`.
- Creator flags and any banner-preview key suppress browser analytics in `analytics.ts`; the banner also excludes creator and preview states from its analytics `rendered` condition.
- `End trial now` and `Reset test state` are rendered only for creator mode. They mutate local access state but do not call analytics directly; creator suppression prevents their resulting banner state from being sent by the intended UI flow.
- A normal device with an expired `trialStart` in localStorage will log on page render. The clock does not schedule a timer; expiry is detected when React renders/re-renders and computes zero days remaining.
- The server writer does not verify the submitted event against the stored trial start (which remains browser-local), so the database row alone cannot prove that 14 days elapsed.
- Both supplied records definitely contain `trial_day = 0` and were inserted on 26 August 2026. Their excerpts do not include the corresponding `trial_started` rows or any browser-state/action evidence, so they do not by themselves prove which eligible trigger produced them.

# Temporary trial diagnostic (read-only, no behaviour change)

Purpose: establish exactly what the production server decided during the Incognito test.
Nothing about trials, analytics, pricing, Creator Mode, the database or the funnel changes.

## What gets added

One new temporary endpoint, `src/routes/api/public/trial-check.ts`, following the same
names-only pattern as the existing env-check endpoint. Visiting it in a browser reports,
**for that request only**:

- `cookiePresent` — was a `vw_vid` cookie sent (true/false, value never shown)
- `networkResolvable` — could the server resolve a network address (true/false, address
  and hash never shown)
- `grantsTableReachable` — could the grants table be read (true/false)
- `matchingGrantsForNetwork` — how many existing grants share this network
- `knownVisitor` — does the cookie match an existing grant
- `wouldGrantNewTrial` — what the live decision logic would answer for this request
- `wouldReportIsNew` — whether that answer would cause `trial_started` to be recorded
- `pathTaken` — `server` or `fallback`, i.e. whether the app would use the server answer
  or the "server unavailable" fallback that also records `trial_started`

It is strictly read-only: it performs **no insert**, issues **no cookie**, and cannot
create or consume a trial. It therefore reports what the live logic *would* decide,
which is precisely the question. Whether the Incognito request actually inserted a row
is answered separately by a simple count of grant rows, included in the report as
`totalGrants`.

No IP address, hash, cookie value, credential or other sensitive value is returned.

## How we use it

1. Open the endpoint in your normal browser (the one that already has a trial).
2. Open the same endpoint in Incognito.
3. Send me both outputs; I report the cause with the two answers side by side.

## Afterwards

The endpoint is removed once the cause is confirmed. No fix is made in this step.

# Why Incognito still got a trial — read-only findings

No code, data, or settings were changed.

## Short answer

The protection is working exactly as it was written — and as written it *allows* the
second browser. Two things combine:

1. Incognito has no cookies from Browser A, so the server correctly saw "no known visitor".
2. The network-based backstop only treats a visitor as a repeat once **two or more**
   grants already exist for the same network (`NETWORK_GRANT_ALLOWANCE = 2`, deliberately
   set above 1 so households and offices are not blocked). With only **one** existing grant,
   the Incognito visit was judged a legitimate new visitor, a fresh trial was granted,
   `isNew: true` was returned and `trial_started` was recorded.

So the Incognito test did not defeat the system; the system's own allowance let it through.

## Answers to each question

- **Why did Incognito generate `trial_started`?** `syncServerTrial()` logs `trial_started`
  only when the server returns `isNew: true` (or when the server call is unavailable —
  see the second possible cause below). The server returned `isNew: true`.
- **Was a `trial_grants` row created?** It should be — the grant is inserted before the
  claim is returned. You report the table still holds **one** row. Either it was read
  before the Incognito visit, or the insert failed. That second case matters (below).
- **Which code path decided it was entitled?** `claimTrial()` in `src/lib/trial.server.ts`:
  cookie lookup misses -> network grants counted -> count (1) is below the allowance (2)
  -> new token issued, new grant inserted, `isNew: true`.
- **Is the server checking `trial_grants` before `trial_started`?** Yes. The browser only
  logs the event after the server answers.
- **Is the cookie set and checked?** Set on the response (`vw_vid`, HttpOnly, Secure,
  SameSite=Lax, 10 years) and checked first on every visit. Incognito simply has none —
  that is expected and cannot be prevented.
- **Is the network hash generated and compared?** Only when the server can read a network
  address, via `getRequestIP({ xForwardedFor: true })`. Behind the production edge that
  header is not guaranteed; if it is absent the hash is `null` and **no comparison happens
  at all**, so every cookie-less browser gets a fresh trial regardless of the allowance.
  This is unverified in production and is the second candidate cause.
- **Is production running the new code?** Yes — the browser only reaches `trial_started`
  through the new server path; the old browser-only behaviour survives only as a fallback.
- **Where is `trial_started` generated?** `src/lib/trial.ts`, in `syncServerTrial()` —
  three call sites: server unavailable, thrown error, and `claim.isNew === true`.

## The fallback is masking failures

If the database call fails for any reason (missing table, credentials, insert error),
`claimTrial()` returns `available: false` and the browser logs `trial_started` anyway.
That path produces exactly the symptom you saw **and** leaves `trial_grants` at one row.
Given the row count you report, this is as likely as the allowance explanation.

## Proposed next step (verification before any fix)

1. Add a temporary, names-only diagnostic (same pattern as the existing env-check route)
   reporting, for the current request: whether a `vw_vid` cookie was present, whether a
   network address was resolvable, whether the grants table was reachable, and how many
   grants match the network hash. No addresses, no hashes, no secrets in the output.
2. Repeat the Browser A / Incognito test against it and read the two answers.
3. Only then choose the fix: lower the network allowance, add a reliable address source
   for the production edge, and stop the "server unavailable" fallback from logging a
   legitimate `trial_started`.

No change to trial length, pricing, Stripe, Creator Mode, test-device protection or
funnel definitions is proposed.

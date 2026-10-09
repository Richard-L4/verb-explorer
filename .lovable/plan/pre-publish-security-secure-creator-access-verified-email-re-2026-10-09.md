# Pre-publish security: secure creator access, verified email restore, full verification

Nothing is published during this work.

## 1. Gaps found in the current code

1. **Creator code is public.** `CREATOR_QUERY_VALUE` is written in `src/lib/access.ts`, so it ships in the browser bundle and is in GitHub history. Creator mode is only a local browser flag. The server never checks it, which is why paid Subjunctive stays locked for you on the live site.
2. **The Funnel panel uses the same public code.** `analytics.functions.ts` checks that same public value, so anyone who reads the bundle could read your funnel and repeat-visitor numbers.
3. **Restore by email doesn't prove ownership.** It only checks that a purchase exists for the address, so anyone who knows a buyer's email gets a purchase pass. It also reveals whether an email has bought ("We couldn't find a purchase").
4. **Passes never expire.** Purchase passes are re-checked against the database on every request (good), but they have no expiry, and there is no creator pass type.
5. **Already sound, to be re-verified rather than changed:**
   - Checkout only issues a pass when Stripe reports `paid`.
   - The webhook is idempotent (checks the session id).
   - The full dataset is only loaded inside a server handler.
   - Price is the live `price_1U66oMJ7wpJmIRgYHaLwO2VH`, £4.99 GBP, one-off, active.

## 2. Secure creator access (URL stays `?creator=...`)

- **New secret code.** A new server-only secret `CREATOR_ACCESS_KEY`. Because the old code `hilary53` is permanently public in GitHub history, it must not be reused. You choose a new strong value and enter it once in the secure secrets form I'll open. You'll need to know it, so I can't auto-generate it. Your creator link becomes `?creator=<your new value>`.
- **Validation:**
  1. On page load with `?creator=`, the app immediately removes the parameter from the address bar, so it isn't kept in history or shared links. It then sends the value once to a new server function, `claimCreator`.
  2. The server compares it with `CREATOR_ACCESS_KEY` in constant time. On a match it issues a **creator pass**, signed with `CONTENT_PASS_SECRET`, of type `creator`, expiring in **30 days**. The pass also carries a fingerprint of the current key, so changing the key cancels every existing creator pass.
  3. A wrong, missing or edited value gets the same generic "no" and no pass. Attempts are rate-limited. The value is never logged or sent to analytics.
- **In use:**
  - The pass is stored in the browser and sent with every protected request: Subjunctive content and the Funnel panel. The server checks the signature, expiry and key fingerprint each time.
  - Pages, direct links, Random Subjunctive and refreshes all work with no further action.
  - Removing the parameter later changes nothing while the pass is valid.
  - When it expires, the app falls back to normal free access until you open the creator link again.
- **Local creator flag:** existing creator-only tools (banner previews, test-device latching, Settings badge) are only switched on after the server accepts the code. The old "any `?creator=hilary53` works" path is removed. Lovable Preview keeps its automatic creator mode, which the server already verifies from the preview address.
- **Separate from purchases:** creator and purchase passes are different types. A purchase pass never grants creator tools such as the Funnel panel. Both give all 100 entries and every difficulty.

## 3. Verified Restore by email

- **Resend:** you already use it, sending from `noreply@richard-wells.com` with `RESEND_API_KEY`. The free tier is 100 emails a day, so no new cost and no dashboard change.
- **New table `restore_codes`** (manual SQL file `db/restore_codes.sql`, like your earlier ones). It is needed because one-time use, attempt limits and rate limits must be stored somewhere: servers keep no memory between requests. It holds:
  - an email hash (not the email)
  - a salted hash of the code (never the code itself)
  - the expiry time and attempt count
  - when the code was used
  - a hashed network value for rate limiting

  The table is locked down to server-only access.
- **Flow:**
  1. The user enters an email. The server always replies "If that email has a purchase, we've sent a code". A code is only sent when a paid purchase exists.
  2. The code is 6 digits, valid for 10 minutes, single use, with 5 wrong attempts at most. Limits are 3 requests per email per hour and 10 per network per hour.
  3. The user enters the code. The server checks it and marks it used, then re-checks the purchase and issues the `email` purchase pass. The browser never decides success.
- **Existing buyers:** this works after clearing the browser or changing device, and an expired trial doesn't block it. The "Confirm your purchase" panel uses this flow.
- Codes, passes and secrets are never logged.

## 4. Passes, all types

- Every pass gets an expiry: purchase 1 year, creator 30 days, preview 1 day.
- Purchase passes keep their database re-check on each request.
- Tampered, fabricated or expired passes are rejected and the browser deletes them.

## 5. Policy kept exactly

The policy stays as now:
- All 100 verbs free.
- The fixed 20 Subjunctive IDs free at Easy only.
- The other 80, and all Medium and Hard, need a purchase or creator pass. The trial doesn't unlock them.
- Sayings unchanged.

Trial, reminders, Stripe price, checkout, webhook and analytics events are unchanged. The only analytics change is that the Funnel panel now requires a creator pass instead of the public code.

## 6. Files

- **New:**
  - `src/lib/creator.functions.ts` (claimCreator)
  - `src/lib/restore.functions.ts` and `src/lib/restore.server.ts` (request and verify code)
  - `db/restore_codes.sql`
  - tests `creator.test.ts` and `restore.test.ts`
- **Changed:**
  - `content-pass.server.ts`: creator type, expiry, key fingerprint
  - `subjunctive-content.functions.ts`
  - `access.ts`: remove the public code, enable creator only after the server says yes
  - `use-subjunctive.ts`
  - `analytics.functions.ts` and `FunnelPanel.tsx`: require a creator pass
  - `RestorePurchase.tsx`: two-step email then code
  - `checkout.functions.ts`: the old email restore is removed
  - `payments.server.ts`: email sending helper
  - `AGENTS.md`

## 7. Verification before you publish

- **Automated tests:**
  - creator pass valid, wrong, edited, expired, or issued under an old key
  - purchase pass doesn't grant creator tools
  - codes: expiry, single use, attempt limit, rate limits, same reply for unknown emails, successful restore
  - checkout not paid means no pass
  - all existing 66 tests
- **Server checks against the running app:**
  - direct calls to the content and Funnel functions with no pass, a fake pass, an expired pass and an edited pass all return nothing
  - a valid creator pass and a real purchase pass return content
- **Production build:** I'll make a build in a temporary folder and search the browser files for the creator secret, the old code, and every locked example sentence.
- **Browser, phone/tablet/desktop:**
  - free user
  - expired-trial user
  - purchaser
  - creator link (the parameter disappears from the address bar, full access across pages, direct links, Random Subjunctive and refresh)
  - wrong creator value
  - Random dropdown and sequences, Sayings, no sideways scrolling or errors
- **Report:** a final checklist of manual steps (set `CREATOR_ACCESS_KEY`, run `db/restore_codes.sql`), with results, for your approval before publishing.

## Decisions needing your OK

- You'll set a new creator code (the old one can't be made secret again).
- The new `restore_codes` table, created by running one SQL file in Supabase.
- Expiry times: creator 30 days, purchase 1 year, code 10 minutes.

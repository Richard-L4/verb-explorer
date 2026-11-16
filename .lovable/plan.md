# Revised access model: free SER vs ESTAR, everything else £14.99

## What I found (current behaviour)
1. **Trial**: 7 days, tracked on the server by the `vw_vid` trial record (`trial.server.ts`). Today the trial unlocks all verb cards and sayings, all verb quiz questions and **Easy** subjunctive only. It never unlocks Medium/Hard subjunctive.
2. **Free content today**: all 100 verb cards are free forever. The first 20 subjunctive entries are free at Easy level. 20 fixed quiz questions are free after the trial. The first few sayings stay free (`FREE_CARD_COUNT`).
3. **SER vs ESTAR**: id `ser-vs-estar` is the same in the verb deck, present subjunctive and imperfect subjunctive. Quiz questions link to it through `sourceId` (only **2** questions are tagged `ser-vs-estar`).
4. **Quiz**: the server picks the tier and filters the bank (`quiz.server.ts` + `content-access.ts`). Locked questions never reach the browser.
5. **Search ("Ask")**: it only uses content the browser already holds, so it follows whatever the browser is given.
6. **Biggest gap**: verb cards (`verbs.json`) are bundled into the browser for everyone. Locking 98 cards safely means moving them behind the server, the same way subjunctive already works. Hiding them with a paywall alone would be bypassable.
7. **Purchasers**: signed purchase pass plus a database re-check (`content-pass.server.ts`). £4.99 and £14.99 prices are both honoured. Restore by email is unchanged.

## Proposed rules (single policy in `content-access.ts`)
- **Paid / creator**: everything.
- **Active trial (server-verified)**: everything, including Medium/Hard subjunctive (this is new).
- **After trial, unpaid**: `ser-vs-estar` only. That means the full verb card, the present and imperfect subjunctive at all levels, quiz questions with `sourceId: ser-vs-estar`, and search over that content. Sayings are all locked.
- One constant, `FREE_COLLECTION_IDS = ["ser-vs-estar"]`, replaces `FREE_SUBJUNCTIVE_IDS`, `FREE_QUIZ_IDS_AFTER_TRIAL` and the free-sayings count.

## Stages
1. **Policy**: rewrite the tier functions in `content-access.ts` (verbs, subjunctive, quiz, sayings) around one `tier: full | trial | free`. Update the memory rules that this change replaces.
2. **Server-side verbs**: generate `verbs.public.json` (titles/taglines for all, full content for ser-vs-estar only). Add `verbs-full.server.ts` and a server function that returns full cards for a valid pass or active trial. Card, browse, random, favourites, statistics and Ask switch to a `useVerbs` hook (same pattern as `useSubjunctive`).
3. **Subjunctive**: the existing signed-pass function also releases everything during a server-verified trial. The public JSON keeps only ser-vs-estar.
4. **Quiz**: tier "free" = questions whose `sourceId` is `ser-vs-estar`. Mixed and random quizzes draw only from the allowed bank. Regenerate `quiz.public.json`.
5. **Sayings**: move to the same server-gated pattern (public titles, full text for trial/paid). This also covers the North American set.
6. **UI copy**: the expired-trial banner, the paywall and the home page note say "Keep learning SER vs ESTAR free, or unlock everything for £14.99". Home, Unlock, Settings, Restore, Terms and Privacy stay open.
7. **Tests**, then a browser check in trial, expired, paid and restored states.

## Tests to add
Trial user sees all content. Expired user: ser-vs-estar card, subjunctive (all levels) and its quiz questions are open; any other card, subjunctive entry or saying is locked, both on the page and when fetched directly from the server. Mixed and random quizzes contain no paid questions. Search finds ser/estar and reports other verbs as locked. £4.99 and £14.99 passes, plus a restored pass, get everything. A forged local "unlocked" flag gets nothing. Existing 318 tests are updated only where they assert the old free rules, and each change is listed.

## Unchanged
Trial length and identity checks, Stripe, price IDs, secrets, £14.99, checkout, restore, and the database (no migration needed).

## Clarifications (approved)
- **Quiz classification**: the free set is an explicit list, `SER_ESTAR_QUIZ_IDS`, and I'll check each question by reading it. Confirmed so far: q001 and q101, both of which test the distinction. q033 (estar de acuerdo) only mentions ser in passing, so it stays paid. Any question that genuinely tests the distinction but is filed under a different card gets its `sourceId` corrected. Each correction will be listed for you, and no question text changes.
- **Trial**: an active trial, verified on the server, gets everything, including Easy, Medium and Hard present and imperfect subjunctive.
- **No leaks**: a build check confirms that the browser files, source maps, public JSON files and server replies contain no locked verb, saying or subjunctive text. A test greps the built output for sample locked sentences.
- **Expiry**: content you were given during the trial or under a pass stays only in memory, never in browser storage. Each reply carries the date its access ends; when that date passes, the content is dropped and fetched again. A pass the server revokes returns only free content on the next load.
- **Purchasers**: £4.99 and £14.99 purchases, including restored ones, get full access. Tests cover both.
- **Process**: the work is done stage by stage. I run the tests after each stage and report the results before continuing.
- **Roadmap**: I'll add this task to roadmap.md when building starts, because I can't edit files in plan mode.

## Credit estimate per stage (approximate)
| Stage | Work | Credits |
|---|---|---|
| 1 | Policy and tier rewrite, plus tests | 1.5–2 |
| 2 | Verb cards behind the server, plus the hook and page switch-over | 4–5 |
| 3 | Subjunctive fully unlocked during the trial | 1–1.5 |
| 4 | Quiz free set and reclassification | 1.5–2 |
| 5 | Sayings behind the server | 2.5–3 |
| 6 | Expiry handling and wording | 1.5–2 |
| 7 | Leak check, full test run, browser check of 4 user states | 2–3 |
| | **Total** | **about 14–18** |

This is more than the 6-credit ceiling you used for earlier tasks. I will stop at the end of any stage if your balance would fall below the floor you set.

## Likely files
`content-access.ts`, `subjunctive-content.functions.ts`, `quiz.server.ts`, `use-access.ts`, `access.ts`, new `verbs-full.server.ts` / `verb-content.functions.ts` / `use-verbs.ts` / `verbs.public.json` + build script, `sayings.ts` + server gate, routes `card.$cardId`, `browse`, `random`, `favourites`, `statistics`, `sayings`, `saying.$sayingId`, `search`, `src/lib/ask/*` (data source only), `Paywall.tsx`, `TrialBanner.tsx`, `CardGrid.tsx`, `SayingGrid.tsx`, `index.tsx`, related tests, `AGENTS.md`.

## Approved process (from your note)
- I'll go through all seven stages without stopping for approval in between. Before each stage I report the credit balance and its estimate. After each stage I report the files changed, test results, fixes made and the credits left. I don't move on until that stage's tests pass.
- **First visit after the trial**: a visitor whose trial has already ended, and who never came back during it, gets the free SER vs ESTAR collection straight away. That content is public, so it never depends on having a trial record.
- Tests make direct server requests as well as checking the screens. They cover expiry, a revoked pass and restored purchases, and confirm that no trial or paid content is written to browser storage.
- At the end: the full test suite, a security check of the built output for locked content, and one combined report. Nothing will be published.

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

## Points to confirm
- Only 2 quiz questions are tagged ser-vs-estar. Questions that only mention ser/estar under other cards (e.g. ser-vs-parecer) stay paid unless you say otherwise.
- The trial will now unlock Medium/Hard subjunctive, which reverses the current "trial never unlocks subjunctive" rule.
- Stage 2 (moving verb cards to the server) is the largest piece and will cost noticeably more credits than earlier tasks.

## Likely files
`content-access.ts`, `subjunctive-content.functions.ts`, `quiz.server.ts`, `use-access.ts`, `access.ts`, new `verbs-full.server.ts` / `verb-content.functions.ts` / `use-verbs.ts` / `verbs.public.json` + build script, `sayings.ts` + server gate, routes `card.$cardId`, `browse`, `random`, `favourites`, `statistics`, `sayings`, `saying.$sayingId`, `search`, `src/lib/ask/*` (data source only), `Paywall.tsx`, `TrialBanner.tsx`, `CardGrid.tsx`, `SayingGrid.tsx`, `index.tsx`, related tests, `AGENTS.md`.

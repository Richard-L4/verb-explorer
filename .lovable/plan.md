# Quiz for Verb Wise — revised with server-side protection

## 1. How paid Subjunctive content is protected today

- **The browser gets only free content.** It only receives `subjunctive.public.json`, which holds the free Easy examples for the first 20 entries. A script generates it.
- **The full file is server-only.** `subjunctive.json` is read only by `subjunctive-full.server.ts`. That module is loaded inside a server handler, and the build blocks `*.server.ts` files from browser code.
- **Paid examples need a server-signed pass.** `getProtectedSubjunctive` returns paid examples only for a valid pass that the server signed. The server re-checks the purchase in the database, or checks the creator key or preview host.
- **Browser flags never unlock anything.** The local "unlocked" flag, URL values and other browser state are never trusted.
- **Production builds were scanned:** 0 of 840 locked sentences were found.
- **The trial is held on the server.** An HttpOnly cookie, `vw_vid`, points to a row in `trial_grants` that stores the trial start date. The browser can't change it.

## 2. Is the earlier plan secure? Not fully

The earlier plan put **all Verb questions** (Easy, Medium and Hard) and the Easy Subjunctive questions in the public file. It decided trial versus after-trial in the browser.

After the trial, an unpaid visitor may only use 20 Easy questions. They could change browser state, or read the public file, and get every Verb question plus every Easy Subjunctive question. That breaks your rule that paid questions can't be obtained by manipulating the browser.

Medium and Hard Subjunctive questions would have stayed protected. Medium and Hard Verb questions, and the trial-only Easy questions, would not.

## 3. Revised design (smallest secure version)

**Public file (`src/data/quiz.public.json`):**
- Contains only the **20 fixed after-trial questions**: the first 20 Easy questions in file order. That gives 15 Verb and 5 Subjunctive questions.
- Everyone may see these, so it's safe for them to ship to the browser.
- Mix uses this same pool and never adds questions.

**Master file (`src/data/quiz.json`):**
- Your file, copied byte for byte and verified by checksum.
- Read only by a new `src/lib/quiz-full.server.ts`, which is loaded inside a server handler. This is the same pattern as Subjunctive.
- Never imported by the browser or the build script's output.

**New server function `getQuizQuestions` (in `src/lib/quiz.functions.ts`):** the server works out the visitor's level itself.

| Server finds | Questions returned |
|---|---|
| A valid purchase or creator pass, re-checked in the database (preview-host passes as today) | All 100 |
| No pass, and the trial cookie maps to a trial that started less than 7 days ago | All 50 Verb questions plus the 15 Easy Subjunctive questions |
| Anything else (expired, no cookie, tampered pass, unknown) | Nothing extra; the page uses the public 20 |

- The trial check reads only the server's own cookie and the `trial_grants` row. The trial length is the same 7-day setting the app already uses, unchanged.
- Nothing the browser sends can raise the level except a server-signed pass.

**In the browser:**
- `useAccess()` decides only which unlock prompt to show. Locked levels show the existing prompt with the £4.99 price.
- Access rules live in `content-access.ts` as pure functions (`quizTier`, `FREE_QUIZ_IDS_AFTER_TRIAL`). The server uses them to filter, and the page uses them for the prompts.

**Also part of the build (unchanged from the first plan):**
- the Quiz page and nav tab
- the green NEW · Quiz card
- the Random Subjunctive button, linking to the existing page
- the home-page Quiz box
- quiz score and progress kept on your device only, separate from flashcards and trial
- shuffling through `random-sequence.ts` with no repeats until a round is used up
- the empty-choice message

**Failure handling:** if the server can't confirm the trial, for example because the database is unavailable, the visitor gets only the public 20. Nothing extra is ever opened by mistake.

## 4. Checking the public build for leaks

- **Scan the build.** After a production build, a script scans every file in the browser output (JavaScript, CSS, HTML, JSON, the service-worker files and any `.map` files). It searches for each of the 80 restricted questions' question text, all four option texts and all feedback. It also searches for the master file's checksum.
  - **Expected:** 0 restricted matches. All 20 public questions are present.
- **Look for source maps.** If any `.map` files exist in the browser output, they get the same scan.
- **Check the import chain.** The browser code must never import `quiz.json` or `quiz-full.server.ts`. The build's own server-file blocking enforces this too.

## 5. Tests I'll run

**Automated tests (vitest):**
- Exactly 20 fixed after-trial IDs, Easy only, from both categories, matching the file order.
- Tier filtering:
  - purchase or creator gives 100
  - in-trial gives the 50 Verb questions plus 15 Easy Subjunctive questions
  - expired or none gives only the 20
- Mix never exceeds the pool for its tier.
- The public JSON holds exactly the 20 permitted questions and none of the other 80.
- The master file's checksum equals the uploaded file's.
- `getQuizQuestions` handler logic, with fake checks:
  - **refused:** no pass, a tampered pass, an expired trial, a missing cookie, and a forged "paid" or "trial" value in the request body
  - **accepted:** a valid purchase pass and an active trial
- Session tests:
  - no repeats until the round is used up
  - changing tab or level starts a new round
  - an empty pool shows the message
- The full existing suite (currently 98 tests), to show that purchase, Restore by email, creator mode, trial, analytics, flashcards and sayings still pass.

**Real checks:**
- The production build plus the leak scan above.
- Browser checks at 390px, 820px and 1280px on the workspace copy:
  - **unpaid, after the trial:** only the 20 questions, with locked levels showing the prompt
  - **in the trial**
  - **creator mode**
  - also the nav tab, the NEW card, Random Subjunctive, answering, feedback, score, Next and Restart
- **Direct requests:** call the question function with no pass and with a forged pass, and confirm nothing restricted comes back.

**Limitations (I'll report them honestly):**
- The live site can only be checked after you publish.
- I'll test the in-trial level using a temporary trial record on the workspace copy, then delete it. The workspace copy no longer records Funnel visits.
- I'll test the purchase level with a test purchase pass, as in earlier audits, unless you prefer creator mode only.

## Not changing

- the question bank
- prices, Stripe and purchases
- trial length and trial logic
- Restore by email and creator mode
- analytics
- the verb, subjunctive and sayings content and their rules

Nothing will be published.

## Addendum: final build instructions folded in

- **The server checks the trial itself.** `getQuizQuestions` reads the `vw_vid` cookie and the matching `trial_grants` record on the server, compared against the existing 7-day setting. The pass checks reuse the existing signed-pass rules: signature, expiry and role. A purchase pass is re-checked in the database. Creator and preview passes follow the current rules. If anything goes wrong, the visitor gets only the public 20.
- **Responses are never cached.** The function's reply is marked `Cache-Control: private, no-store`, so one visitor's questions can't be served to another.
- **Tests run against the real server function.** They use mocked checks and database to call the actual function, including requests with forged `paid`, `trial` or tier values.
- **Two small conflicts I'll report rather than change silently:**
  - The question IDs in your file are lowercase (`q001`–`q100`). The tests will check those exact IDs.
  - The brief says Random Subjunctive should link to "the existing Subjunctive page". I'll point it at the existing **Random Subjunctive** page, which matches how Random Verbs works.
- **How the fixed public 20 are chosen:** the generator first keeps only the Easy questions from the master file, then takes the first 20 in the original order. It does not take the first 20 rows of the whole file. Checked against your file: that gives exactly 15 Verb and 5 Subjunctive questions. Tests confirm those exact lowercase IDs and their order against the master file. The generator stops with an error if the split is ever anything other than 15 and 5.

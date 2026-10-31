# Imperfect Subjunctive – Implementation Plan

## A. Current app (inspected)
- Present Subjunctive: master data `src/data/subjunctive.json` (100 entries, ids match the 100 verb cards, 3 triggers x 3 examples, easy/medium/hard, plus `tricky`). Browser only gets generated `subjunctive.public.json`; full data loads on the server (`subjunctive-full.server.ts`) and is released only for a server-signed, purchase-rechecked pass or creator pass.
- Pages: `/subjunctive` (list), `/subjunctive/$entryId` (detail via `SubjunctiveEntryView`), `/random-subjunctive` (Random menu).
- Access (`content-access.ts`): first 20 entries free at Easy only; trial never unlocks subjunctive; paid/creator get everything.
- Quiz: `quiz.json` (100 questions, server-only), public 20 fixed; tabs Verbs / Subjunctive / Mix; tiers public / trial (all Verbs + Easy Subjunctive = 65) / full.
- Entry points to Present: side/bottom nav "Subjunctive"; Home hero "New · Subjunctive" announcement card; Home Subjunctive feature block (Explore + Random Subjunctive buttons); Home Quiz block copy; Random dropdown "Random Subjunctive"; Quiz "Subjunctive" tab; ConfirmPurchase/Restore copy. Individual verb card pages currently have no subjunctive link.

## B. Supplied data
- `imperfect-subjunctive.corrected.json`: PASS. Exactly 100 entries, ids identical (same order) to the present file and verb deck, no duplicates, 3 triggers x 3 examples each (300 easy/medium/hard), same fields as present. Copied byte-for-byte, not edited.
- `quiz_questions_final.json`: 150 questions. q001–q100 are byte-identical to the current bank. q101–q150 are new, all labelled only `category: "subjunctive"` (no tense field); every one reads as imperfect (past triggers, -ra forms). Split: 10 easy, 20 medium, 20 hard. Gap: the file itself does not mark tense — see J.

## C. Navigation / UI
- Nav item "Subjunctive" stays (same route `/subjunctive`) but becomes a tense chooser hub: two equal cards, "Present" and "Imperfect", each with Easy/Medium/Hard chips and a Quiz shortcut.
- `/subjunctive/present` (list, current page content) and `/subjunctive/imperfect` (new list) with existing difficulty filter. Detail: `/subjunctive/present/$id` and `/subjunctive/imperfect/$id`, each with a "Switch to Imperfect/Present" toggle for the same verb.
- Old URLs keep working: `/subjunctive/$entryId` redirects to `/subjunctive/present/$entryId`. NEW label moves to the Imperfect card.

## D. Entry-point updates
- Home hero announcement: "New · Imperfect Subjunctive" linking to the hub.
- Home Subjunctive block: copy covers both tenses; buttons "Present", "Imperfect", "Random Subjunctive".
- Random dropdown: Random Subjunctive gains a Present / Imperfect toggle (one menu item, no extra nav).
- Verb card detail: new small "Subjunctive: Present · Imperfect" links (locked state shown per access rules).
- Quiz: Subjunctive tab gets a Present / Imperfect sub-toggle; Mix includes all three. Copy on Home quiz block and quiz page head updated.
- Search: unchanged (verb search); hub list pages keep their existing in-list filter.

## E. Teaching section
- Reuse `SubjunctiveEntryView`, list components, difficulty badges and paywall unchanged, parameterised by tense.
- Add `src/data/imperfect-subjunctive.json` (server-only), generated `imperfect-subjunctive.public.json`, server loader and a `tense` argument on the existing server content function.

## F. Quiz
- Replace bank with the 150-question file (q001–q100 untouched). Tense is assigned in code by a fixed id list (q101–q150 = imperfect, all other subjunctive = present), with a test asserting that list; question text unchanged.
- Subjunctive tab: Present / Imperfect selection; Mix = Verbs + Present + Imperfect, deduped by id, existing no-repeat rounds, scoring and feedback unchanged. Badge shows "Present"/"Imperfect" on subjunctive questions.

## G. Access (same rules as Present)
- Imperfect teaching: same 20 free ids at Easy only; rest locked; trial does not unlock; paid/creator full. Server enforces via the same signed pass; locked examples never in browser files; direct URLs show the paywall.
- Quiz: public pool stays the same fixed 20 (q101+ come after it, so unchanged). Trial = all Verbs + Easy Subjunctive of both tenses (65 → 75). Paid/creator = all 150. No pricing, Stripe, trial-length or database changes.

## H. Tests
- Data: 100 imperfect ids = verb ids; byte-identical copy; public file has no locked examples; q001–q100 unchanged; imperfect id list = q101–q150.
- Access: each tier (none, trial, expired, paid, creator) for teaching + quiz counts (20 / 75 / 150); forged fields ignored; build scan finds no restricted imperfect content or questions.
- UI: hub, both lists, detail toggle, old-URL redirect, card-page links, quiz toggles and Mix at 390 / 820 / 1280px.
- Regression: full test suite, typecheck, production build.

## I. Phases
1. Data copy + public generators + tests. 2. Server content/access by tense. 3. Routes, hub, redirect, detail toggle. 4. Entry points (Home, Random, card page). 5. Quiz bank + tense split + Mix. 6. Full test/browser/bundle checks. No publishing.

## J. Decisions (approved)
1. q101–q150 are the Imperfect set, classified in one central list in code; tests check all 50 stay classified. Wording, answers, explanations and IDs are unchanged.
2. Trial quiz = 75 questions: 50 Verb, 15 Easy Present and 10 Easy Imperfect. This does not unlock Imperfect teaching material.
3. Imperfect teaching uses the same 20 free verb IDs as Present, Easy examples only.
4. The public 20-question quiz pool stays exactly as it is. A test compares it with today's file, and a build scan checks that no new questions or locked teaching content reach browser files.

## K. Scope
Changes: subjunctive pages/routes, nav hub, Home subjunctive/quiz blocks and announcement, Random menu, card page links, quiz bank and tabs, access helpers, tests.
Untouched: verb cards, Present content, Sayings, pricing £4.99, 7-day trial, Stripe, Restore, creator mode, analytics, database, privacy/legal pages.

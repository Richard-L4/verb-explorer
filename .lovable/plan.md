# Subjunctive learning section

## What I found
- **Files inspected:** the brief, the uploaded `subjunctive.json`, `src/data/verbs.json`, `src/data/cards.ts`, `src/routes/index.tsx`, `src/components/app/nav-items.ts`, `AppShell.tsx`, `src/routes/card.$cardId.tsx`, `VerbCardTile.tsx`, and the access rules in `src/lib/access.ts` / `src/hooks/use-access.ts`.
- **The subjunctive file is not in the project yet.** It only exists as your upload. I'll copy it unchanged to `src/data/subjunctive.json`.
- **Verb cards:** 100 cards, each with id, category, title, tagline, sides (word, core, examples) and tricky.
- **Subjunctive data:** 100 entries. The schema matches the brief exactly:
  - Each entry has id, title and triggers.
  - Each trigger has category, trigger, explanation and examples.
  - Each example has difficulty, level, es, en, form and note, plus an optional contrast with es, en and note.
- **ID matching:** every one of the 100 IDs matches an existing verb card, with no duplicates and no unmatched IDs. The entries also happen to be in the same order as the deck, but matching will use the ID only, never the position.
- **Completeness:** all 100 entries have 3 triggers and 9 examples (900 examples in total). 300 examples have a contrast and 600 don't.
- **Levels:** always easy = A2, medium = B1, hard = B2 (300 each).
- **Trigger categories:** conjunction 125, wish 52, doubt 47, impersonal 34, emotion 33, other 9.
- **Data issues found:** none. The checks below will confirm this in the browser, and their results go into the final report.

## Completeness rule
An entry counts as complete when:
- its id matches a verb card;
- it has exactly 3 triggers;
- each trigger has non-empty category, trigger and explanation text, plus exactly 3 examples;
- each example has non-empty es, en, form and note, a difficulty of easy, medium or hard, and a level of A1–C2.

A contrast is optional. If it's there, it needs es, en and note, otherwise that example gets a warning. Incomplete entries, and verbs with no entry at all, show **Coming soon** instead of breaking the page. Counts always come from the data, never typed in.

## Essential work
1. **Navigation:** add a "Subjunctive" tab after Browse, using the same style and the same mobile menu.
2. **Landing page:** add a Subjunctive box between the Verbs box (Start studying / Browse) and the Sayings box. It copies the Sayings box styling, with its own badge, a "Subjunctive" heading, one line of description (count from the data) and an "Explore the subjunctive" button. The other boxes stay exactly as they are.
3. **/subjunctive (list page):** a page header and the same filter and "Load more" style as Browse (24 at a time), plus a search box covering verb title, trigger phrases and examples. Each tile shows the verb title, the three trigger phrases as small labels, their categories, and a Locked or Coming soon label where it applies.
4. **/subjunctive/$id (detail page):**
   - At the top: the verb title, the verb card's own meanings (from its existing `core` text), and a link back to the verb card.
   - Three tabs, one per trigger, showing the trigger phrase and its category. They stack neatly on phone.
   - Each tab shows the explanation, then three example boxes. Each box has a difficulty and level label, the Spanish sentence, the English translation, the subjunctive form highlighted, and the note.
   - Where a contrast exists, it appears inside that example box as a clearly labelled "Compare" panel with its Spanish, English and note.
   - Previous and Next buttons go through the entries and loop round, with an "Entry X of N" indicator.
5. **Access:** no new rules. I'll reuse the existing lock check from the verb card with the same ID. During the trial, after purchase and in Creator Mode, everything is open. After the trial ends, only the 10 free verb cards' subjunctive entries stay open, and the rest show the existing paywall. Pricing, trial, Stripe and analytics stay as they are.
6. **Development-only checks:** console warnings, never shown to users, for:
   - missing or duplicate IDs, and IDs with no matching verb card;
   - missing or malformed triggers, or the wrong number of triggers or examples;
   - empty required text;
   - invalid difficulty or level;
   - malformed contrasts and wrong data types.

   Each warning names the entry ID, the trigger number and the example number. Nothing is logged when the data is clean.

## Optional extras (only if you want them)
- A "Subjunctive" link on each verb card page that goes to its matching entry.
- Filtering the list by trigger category.
- Remembering which entries you've opened. This would need a new saved setting, so I'd rather leave it for now.

Not included: the quiz, any changes to the data, and any backend or database work.

## Testing
- Automated tests for the completeness rule:
  - a complete entry passes;
  - one example too few fails;
  - an empty note fails;
  - a missing contrast still passes;
  - an incomplete contrast warns;
  - an unknown ID is flagged;
  - an invalid level is flagged.
- An automated check that all 100 real entries come out complete and match a verb card.
- Browser checks at phone, tablet and desktop sizes:
  - the new tab and landing box, and that the box sits in the right place;
  - the list page and Load more;
  - a detail page showing 3 triggers and 9 examples, with accents and punctuation intact;
  - contrast panels;
  - Previous and Next looping round;
  - an entry that's locked after the trial;
  - no sideways scrolling and no console errors.
- Re-running the existing tests and the type check, and spot-checking that Browse, Search, card pages, Sayings and Random Cards still work.

## Technical details
- New: `src/data/subjunctive.json` (copied unchanged) and `src/data/subjunctive.ts` (types, `isCompleteEntry`, `getEntry`, neighbours, a check that warns only in development, and a search index).
- New: `src/data/subjunctive.test.ts`, `src/routes/subjunctive.tsx` (layout with `<Outlet/>`), `subjunctive.index.tsx`, `subjunctive.$entryId.tsx`, `src/components/app/SubjunctiveTile.tsx` and `SubjunctiveEntryBody.tsx`. Each route gets its own `head()`.
- Edited: `nav-items.ts` (one new item) and `src/routes/index.tsx` (one new section).
- Locking uses `useAccess().isLocked(entry.id)` and the existing `Paywall`.

## Decisions for you
- The free-content rule after the trial is set out under Access above. Approving this plan keeps it.
- Whether to include any of the optional extras.

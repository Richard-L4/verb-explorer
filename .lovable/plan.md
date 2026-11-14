# Plan: Sayings expanded to 75 English expressions (British, American, Canadian)

## 1. What exists today (checked)
- The 25 British sayings live in `src/data/sayings.json` (all category `sayings`), read by `src/data/sayings.ts` (types, `sayingCount`, lookup, neighbours, search).
- `/sayings` (`src/routes/sayings.tsx`) shows a grid with All/Learned/Unlearned/Favourites filters and a search box; `/saying/<id>` shows one saying with prev/next links.
- British shape: title, vibe, literal_fail, several examples (context / Spanish / note). The new file has a different shape: english, meaning, spanish, status, verificationNote, one English example and its Spanish translation, plus category headings, status definitions and source notes.
- Access: sayings are open during the trial and locked afterwards unless purchased; this applies to any saying id, so the 50 new ones follow the same rule automatically. No change to that rule.
- Text that will become wrong: `sayings.tsx` heading description and page title/description ("British sayings"), the Sayings section on the home page ("{count} British sayings ..."). `terms.tsx` and `settings.tsx` say "sayings" generically and stay correct.

## 2. Data
- Copy the uploaded file unchanged to `src/data/northAmericanExpressions.json` (byte-identical, checked by checksum).
- `sayings.json` untouched.
- In `sayings.ts`, add a `region: "british" | "american" | "canadian"` to each card and turn North American entries into the shared card type with their own optional fields (meaning, spanish, status, verificationNote, example pair, category heading). The British ones are wrapped, not edited. Text is never rewritten.
- `sayings` becomes British then American then Canadian (75). `sayingCount` = 75 from data; add `sayingCountByRegion`. Search also covers the new fields. IDs `us_001…`, `ca_001…` kept.

## 3. Screens
- `/sayings`: a row of three-plus-one region buttons above the existing filters: All (75) · British (25) · American (25) · Canadian (25), same pill style. Choosing American or Canadian shows its short introduction and groups tiles under its category headings. British looks as it does now.
- Tiles: new entries show the English expression, meaning and Spanish equivalent, with a small status label.
- `/saying/<id>`: British pages unchanged. New pages show meaning, Spanish equivalent, the example pair, and a status label with its full note under "How this was checked". A "What the labels mean" expandable section shows the source's own status definitions (DLE, DLE (partial), Attested, Usage, Gloss, plus Avoid where used) and source limitations, so the main view stays uncluttered. Wording makes clear an equivalent is not always a dictionary translation.
- Prev/next stays within the same region.

## 4. Wording updates
- Sayings page: description "75 English expressions with Spanish equivalents — British, American and Canadian English." (number from data). Title/description in page metadata updated to "English expressions".
- Home page Sayings section: same phrasing with the live count.
- Nothing else changes (pricing, trial, payment, quiz, verbs, Ask).

## 5. Concerns
- As today, all sayings text is included in the page download; locking is a screen gate, as it already is for the British 25. Not changed by this work.
- Learned/favourites keyed by id, so new ids don't collide with British progress.

## 6. Tests (new `src/data/sayings.test.ts`, plus a page check)
- 75 total; 25 per region; ids unique.
- British 25 identical to `sayings.json`.
- Every North American entry equals its source fields exactly; each category id exists in its region.
- Search finds a US and a Canadian expression.
- Browser check: region buttons switch counts, a new detail page shows status and note, mobile has no sideways scrolling.
- Full existing suite (282) must still pass.

## Files
- New: `src/data/northAmericanExpressions.json`, `src/data/sayings.test.ts`
- Edit: `src/data/sayings.ts`, `src/routes/sayings.tsx`, `src/routes/saying.$sayingId.tsx`, `src/components/app/SayingCardTile.tsx`, `src/routes/index.tsx`, `AGENTS.md` (one data rule)

Estimated cost: about 3–4 credits.

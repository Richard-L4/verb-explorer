# Expand deck to 100 cards with duplicate-ID and duplicate-verb checks

## Pre-merge inspection (already done, read-only)
- Existing deck: 43 cards. Uploaded file: 57 cards. Same fields on both (id, category, title, tagline, sides, tricky).
- Duplicate IDs across all 100: **none** — the merge can go ahead.
- Duplicate verb pairs (two cards with the exact same set of verbs): **none**.
- Single verbs that appear on more than one card. This is expected with contrast cards, but the check will still report them:
  - ser: ser-vs-estar, ser-vs-parecer (both original)
  - saber: saber-vs-conocer, poder-vs-saber (both original)
  - salir: salir-vs-quedar, dejar-vs-salir (both original)
  - creer: pensar-vs-creer, crear-vs-creer (both original)
  - quedar: salir-vs-quedar (original) + quedar-vs-quedarse (new)
  - llevar: llevar-vs-hacer, traer-vs-llevar (original) + llevar-vs-vestirse (new)
  - tener que: deber-vs-tener-que (original) + haber-que-vs-tener-que (new)
  - ir: ir-vs-venir (original) + ir-vs-irse (new)
- No card is deleted, merged or changed because of these overlaps.

## Data
- Add the 57 cards unchanged after the 43 originals in `src/data/verbs.json` (still the only data file). Check afterwards that the first 43 match the current file byte for byte and the last 57 match the upload.

## Development-only validation (console warnings, never edits data)
Runs once when the deck loads, in development only:
1. **Duplicate IDs**: warns with the ID and the positions where it appears.
2. **Missing fields**: warns for any card missing id, title, sides or tricky.
3. **Duplicate verb cards** (two cards with the same set of verbs, ignoring case and order): warns with both card IDs and the verbs. Each warning says which kind it is: original vs new, new vs new, or original vs original.
4. **Shared verbs** (one verb on more than one card): shown as one grouped, lower-priority console message listing each verb and its card IDs, also tagged original/new. It's kept separate so normal contrast overlaps don't look like errors.
- Nothing is logged when there are no problems.

## Rest of the brief (from the uploaded spec)
- All card totals come from the deck length. Remove any fixed 10/43 numbers from Home, Browse, Search, Favourites, Statistics, Quiz and Card Detail.
- Progress, learned, favourites and recent counts only count IDs that are still in the deck. Saved progress keeps the same storage format and nothing is reset.
- Browse: keep the current filters and add "Not yet learned" wording, an A–Z / Dataset order toggle and "Load more" in steps of 24. Filter, sort and paging all work together and reset when a filter changes.
- Search: searches every text field (already the case), with a short delay while typing.
- Card Detail: Previous/Next wrap around (card 1 back to the last card, last card on to card 1) and show "Card X of N".
- Paid-access rules, Random Cards, the trial, styling and layout stay as they are.

## Technical details
- Validation goes in `src/data/cards.ts`, wrapped in `import.meta.env.DEV`. Verbs come from `sides[].word`, trimmed and lowercased. The pair key is the sorted words joined. Origin is "original" for index under 43, otherwise "new". This number is used only as a label inside the dev check, never shown in the app.
- `getNeighbours` wraps using modulo of `cards.length`.
- `use-learner` filters stored IDs through `getCard` before counting.
- Verify with tsgo, vitest, a Node script that checks the merge, and Playwright on Browse, Search and Card Detail at mobile and desktop sizes.

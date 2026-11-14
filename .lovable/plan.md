# Remove American and Canadian intro boxes on Sayings

## What changes
- On the Sayings page, the box shown when American or Canadian is selected (heading "American collection (25)" / "Canadian collection (25)" plus its paragraph) is removed entirely, including its background, border, padding and bottom spacing. No empty gap remains; the filters bar sits directly under the variety buttons, as it does for British.

## What stays the same
- All 50 American and Canadian expressions, their data file (untouched), cards, category headings, detail pages, variety buttons, filters, search and progress.
- The source introductions remain in the data file; they are just no longer displayed.

## Technical details
- `src/routes/sayings.tsx`: delete the conditional `<section className="surface-card mb-5 ...">` block (lines 103-108) and the now-unused `regionIntroductions` import.
- `regionIntroductions` export in `src/data/sayings.ts` left in place (harmless; existing tests may reference it).
- Run the full test suite and check the page in the browser for American and Canadian.

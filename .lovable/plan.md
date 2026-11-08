# Friendlier wording for made-up words in Ask

Wording-only change. Nothing about detection, matching, vocabulary, ranking or lesson links changes.

## Wording changes (three message strings)

Correction note, before:
> "desperdida" is a learner coinage formed on "pérdida". Did you mean "pérdida" (loss) from perder?

After (built from the same detected values, no hardcoded words):
> The word "desperdida" looks like a word formed by mistake, possibly from "pérdida". Did you mean "pérdida" (loss), from perder?

Nearest-lesson reason, before:
> "desperdida" may be a learner coinage. The verified related word is "pérdida" (perder).

After:
> "desperdida" looks closest to "pérdida" (loss), from perder. This is a spelling suggestion only, not a word with the same meaning.

Common-mistake note, before: "is a common over-regularisation".
After: "is a common mistake: Spanish uses "X" from Y; the nearest lesson is only a suggestion."

## Capitalisation
The quoted word is shown exactly as typed (lower case stays lower case). Sentences open naturally, e.g. "The word "desperdida"…", rather than force-capitalising the detected word.

## "Waste" alternative
No new text. When the question also contains a word like *desperdicio*, the existing "Not covered in the lesson pack" and "Verb or noun?" notes already appear beside the correction, so both meanings are shown rather than one forced correction. Confirmed on screen for the *desperdida / desperjucio* question.

## Tests
- The desperdida answer contains "looks like a word formed by mistake" and "Did you mean", and never "coinage".
- The nearest-lesson reason gives only the suggested word's own meaning and never says it means the same as an off-pack word such as desperdicio.
- The quoted word keeps the learner's own capitalisation.
- All 282 existing tests still pass; none removed or weakened.

## Checks
Screenshots on desktop (1280px) and mobile (390px). No publishing.

## Files
- src/lib/ask/engine.ts (message strings only)
- src/lib/ask/engine.test.ts (new wording assertions)

Estimated cost: about 1 credit.

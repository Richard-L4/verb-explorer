# Friendlier wording for made-up words in Ask

Wording-only change. Nothing about detection, matching, vocabulary, ranking or lesson links changes.

## Wording changes (engine.ts, the two coinage strings only)

Correction note, before:
> "desperdida" is a learner coinage formed on "pérdida". Did you mean "pérdida" (loss) from perder?

After (built from the same detected values, no hardcoded words):
> "Desperdida" looks like a word you've formed by mistake, possibly from "pérdida". Did you mean "pérdida" (loss), from perder?

Nearest-lesson reason, before:
> "desperdida" may be a learner coinage. The verified related word is "pérdida" (perder).

After:
> "Desperdida" may be a mix-up with "pérdida" (perder).

## "Waste" alternative
No new text is added for this. When the question also contains a word like *desperdicio*, the existing "Not covered in the lesson pack" note and the "Verb or noun?" note already appear next to the correction, so the learner sees both meanings rather than one forced correction. I will confirm this on screen for the *desperdida / desperjucio* question.

## Other learner-facing text reviewed, left as is
- "is a common over-regularisation" will become "is a common mistake: Spanish uses "X" from Y; the nearest lesson is only a suggestion." (same plain-language aim)
- Misspelling and "not covered" notes already use "looks like" / "not covered" and say nothing is wrong just because it is missing from the pack.

## Tests
- Add assertions in engine.test.ts that the desperdida answer contains "looks like a word you've formed by mistake" and "Did you mean", and never contains "coinage".
- Run all 282 existing tests; none removed or weakened.

## Checks
Screenshots of the result on desktop (1280px) and mobile (390px). No publishing.

## Files
- src/lib/ask/engine.ts (three message strings)
- src/lib/ask/engine.test.ts (new wording assertions)

Estimated cost: about 1 credit.

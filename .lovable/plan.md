# Smarter "Ask me a question": recognise the verb behind the words

## What I checked
- The Ask search works in the browser. It runs on the full verb deck (all 100 cards in `verbs.json`, through `cards.ts`) plus the subjunctive lessons the visitor is allowed to see. So the brief's "search the whole verb list" step fits the current design with no server, database or new packages.
- Today a card only matches when its exact word appears in the question, such as "perder". Forms like "pierdo" or "pérdida" don't match.
- **perder is in Verb Wise** (the "perder vs faltar" card).
- **desperdiciar is NOT in Verb Wise.** No card or example contains it. Under the brief's own rules, Test A ("desperdicio de agua") must show "Sorry, that verb isn't currently listed in Verb Wise." I won't invent a card for it or point to perder because the English meanings look alike. If you want a desperdiciar card, adding one is a separate content change.

## Files I will change (four, all within the Ask feature)
1. `src/lib/ask/verb-forms.ts` (new): a small table of word forms (pierdo, pierde, pérdida, desperdicio, desperdicia and similar) plus simple ending rules (-o/-as/-a/-amos/-an, -é, -aba and so on) that turn a word into its possible base verbs.
2. `src/lib/ask/engine.ts`: card matching also accepts those base verbs. When a card matches but none of its examples fits the question, the answer adds a short extra explanation labelled "Additional explanation, not an original Verb Wise example". The "verb isn't listed" message appears only when a recognised verb, or a form the table knows, matches no card.
3. `src/components/app/AskPanel.tsx`: shows that extra explanation in the existing answer box with its label. No other design changes.
4. `src/lib/ask/engine.test.ts`: tests A–F, each run against the real verb list.

Search, Privacy, the microphone, the verb data and all other files stay as they are.

## Search order
1. Subjunctive lesson trigger (unchanged).
2. A card word, or a recognised form of one: open that card. If several cards tie, ask the learner which one they mean (unchanged).
3. English meaning hints (unchanged).
4. Recognised verb that is not on any card: "Sorry, that verb isn't currently listed in Verb Wise."
5. Otherwise the existing general fallback.

## Acceptance tests and expected results
- A "desperdicio de agua": desperdicio is recognised as desperdiciar. That verb isn't in Verb Wise, so the "isn't listed" message appears. I'll report this result honestly as a missing verb.
- B "pérdida de tiempo": recognised as perder and opens the "perder vs faltar" card, with a labelled extra note that "pérdida de tiempo" means "a waste of time".
- C "pierdo las llaves": recognised as perder and opens that card.
- D a deck verb in a phrase with no matching lesson: shows the card, not the "isn't listed" message.
- E one verb on a card plus one that isn't: shows the available card.
- F a made-up verb such as "zorbular": "isn't listed" message.
- All 246 existing tests must still pass.

## Cost and stopping rule
- Estimated cost: 3.5–5 credits, within your 6-credit limit. Before I start I'll check the balance is high enough to stay above 25.
- If a test shows a problem that would take more than 6 credits to fix, I'll stop and report it without forcing a change.

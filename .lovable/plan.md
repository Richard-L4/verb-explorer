# Generalised "Ask me a question" search — plan

## 1. What exists today (reused, not rebuilt)
- `src/lib/ask/normalise.ts` — lowercase, accent stripping, fillers, self-corrections. Reused as is.
- `src/lib/ask/verb-forms.ts` — about 120 explicit forms mapped to infinitives, plus cautious ending rules. A guess is accepted only when it matches a real card headword. Reused as Layer 1 and part of Layer 2.
- `src/lib/ask/engine.ts` — mood/trigger detection, English meaning hints (ser/estar, fue/era, saber/conocer...), a card index built from deck words, two checks (intent confidence plus a real entry backing the answer), and results of type `answer | clarify | fallback`. The index, mood logic and checks are all kept.
- `useSubjunctive` supplies only content the user is entitled to. Access rules, trial, Stripe and the database stay untouched.
- `AskPanel.tsx` already shows answers, clarify options and fallbacks. It only needs a "probably" style and a short list of suggestions.

## 2. Being honest about the brief
- **"Behaves like AI" is not achievable deterministically.** A rule engine can reliably handle typos, wrong conjugations, accents and known question patterns. It cannot understand open-ended English. Questions like "How do I say I used to know him?" only work where a hint rule exists (here: imperfect / conocer). That is acceptable, but it should be the stated limit.
- **Telling a real Spanish word from a learner error needs a word list.** Without a dictionary, "desperdiciar" and an invented word look the same. So the engine says "not in Verb Wise" and never says "that word does not exist". It flags a form as wrong only when a rule proves it, e.g. *sabo* is the regular -o pattern on an irregular verb whose real form is known.
- **Ambiguous words (banco, vino, era):** these must come back as a clarify or a nearest match, never as a confident answer. Tests will lock this in.
- **Distance on short words is dangerous.** "es" vs "se" or "va" vs "ve" give false positives. No fuzzy matching under 4 letters.

## 3. Recognition algorithm (one new module, `match.ts`)
For each Spanish-looking word in the question, run these in order and stop at the first confident hit:
1. **Exact:** card headword, explicit form, or a regular conjugation produced from a headword (see 2). Score 1.0.
2. **Generated forms (replaces hand-maintained lists):** at startup, build a list of present, preterite, imperfect and participle forms for every card infinitive using regular -ar/-er/-ir patterns, plus a small irregular table (sé, conozco, puesto, hecho, dicho, tengo, hago...). This removes the need to keep adding dictionary entries. Score 0.95.
3. **Over-regularisation rule:** if a word equals the *regular* form of a verb that has a known irregular form in that slot (sabo → sé, ponido → puesto, conoco → conozco), return the verb plus the correction. Score 0.85, outcome NEAREST with "the correct form is ...".
4. **Fuzzy:** Damerau-Levenshtein (about 30 lines, no package) against the generated-form list, accent-insensitive. Threshold depends on length: 4–5 letters allow 1 edit, 6+ letters allow 2 edits. Accept only when exactly one verb is the closest; a tie becomes clarify. Score = 0.8 − 0.1 × edits (kerer → querer, conosco → conozco).
5. **Root/affix:** strip a known prefix (des-, re-) or noun suffix (-ida, -miento, -cion) and retry steps 1–4 (desperdida → perdida → perder, conocimiento → conocer). Score 0.6, always NEAREST, never MATCH.

## 4. Whole-question interpretation
- Keep the existing mood and meaning-hint rules. They run first and win when they fire.
- Add pattern rules for "why X and not/instead of Y", "difference between X and Y" and "X vs Y". The two words are resolved separately. If both land on the same card, the answer is MATCH on that card. If they land on different cards, the result is NEAREST with both cards shown.
- Card score = best word score + 0.1 for each other question word found in the card's examples, capped at 1.0.

## 5. Outcomes and thresholds (in one `THRESHOLDS` constant, adjustable)
- **MATCH** at 0.9 or above, with a clear lead of at least 0.15 over the next card → current answer view.
- **NEAREST** from 0.55 to 0.9, or when two cards are within 0.15 → "This is probably what you mean:" with the best card plus up to 2 alternatives, each with a one-line reason ("*sabo* → the present of saber is *sé*").
- **NOT AVAILABLE** below 0.55 → "That isn't covered in Verb Wise." Related lessons are shown only when a card scores 0.4 or more. No filler suggestions.
- Unrelated topics (weather, football) keep the existing out-of-scope reply.

## 6. Files
- New: `src/lib/ask/match.ts` (form generator, distance, scoring, thresholds) and `src/lib/ask/match.test.ts`
- Changed: `src/lib/ask/engine.ts` (call match, add a `nearest` result type), `src/lib/ask/verb-forms.ts` (irregular slot table; existing entries kept), `src/components/app/AskPanel.tsx` (show nearest results)
- Not touched: data JSON, access, payments, database, routes.

## 7. Tests (added to the 253 baseline)
One test per row of the brief's table: conozco/pierdo/supiera; habia/perdi; kerer/conosco; sabo/ponido (with the correction text); pérdida/conocimiento; cocinar/nadar/desperdiciar → NOT AVAILABLE; banco/vino/era → never MATCH; "why do I say sé instead of sabo"; perder vs perderse; weather/football → out of scope; false-positive guard (es/se, short words); ranking (the expected card comes first). There will also be a loop over all 100 card infinitives asserting MATCH on their own card, and a timing check that 100 queries take under 200 ms.

## 8. Stages and credits (balance about 29.70, floor 25 → about 4.7 to spend)
- **Stage 1 — essential (about 3–4 credits):** sections 3.1–3.4, the 3-outcome thresholds, the nearest-match view, and core tests. This fits within today's margin, with a hard stop at 25.1.
- **Stage 2 — useful (about 2–3 credits, after the midnight reset):** root/affix step (3.5), comparison patterns (section 4), suggestion reasons, the full 100-card loop.
- **Postponed:** a Spanish word list to say "this word doesn't exist", and free English understanding beyond hint rules. Both would need a dictionary or AI, which the brief rules out.

## Risks
- Generated regular forms can collide between cards (e.g. "paso" fits both pasar and the noun). The tie rule turns these into clarify.
- Threshold tuning may take an extra round, which is the main credit risk. If tuning would breach the floor, I stop and report.

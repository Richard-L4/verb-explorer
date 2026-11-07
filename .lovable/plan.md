# Generalised "Ask me a question" search: revised plan

## 1. What exists today (reused, not rebuilt)
- `normalise.ts`: lowercases text, strips accents, removes fillers, handles self-corrections. Reused as is.
- `verb-forms.ts`: explicit form → infinitive mappings, plus cautious ending guesses that are accepted only when they match a real card headword. This becomes the top-priority layer.
- `engine.ts`: mood and trigger detection, English meaning hints, the card index, the two existing checks (intent confidence plus real entry support), and the `answer | clarify | fallback` results. All kept.
- `useSubjunctive` supplies only content the user is entitled to. The engine works over that data alone.
- The subjunctive lesson data already labels every example's verb form, e.g. `"form": "seas (ser)"` or `"fueras (ser)"`. Many notes also name the wrong forms (e.g. "Never 'quiero que eres'"). Both are used as search data.

## 2. Limits of the brief
- A rule engine handles typos, wrong conjugations, accents and known question patterns. It cannot understand open-ended English beyond the hint rules it has.
- Without a dictionary it cannot prove a word "doesn't exist". It says "not in Verb Wise" instead. It flags a form as wrong only when a rule or lesson note proves it.

## 3. Form index (built from existing data, not a conjugation engine)
Built once per dataset, in this priority order:
1. **Explicit mappings** in `verb-forms.ts` (trusted).
2. **Lesson forms:** every `form` label in the accessible present and imperfect subjunctive examples, e.g. `seas → ser` and `fueras → ser`. This covers whatever subjunctive forms the lessons actually teach.
3. **Known wrong forms** taken from lesson notes (the quoted words after "Never"), marked as `wrong` and pointing to the correct form in the same example.
4. **A small regular fill-in** (present indicative -o/-as/-a only) for card infinitives. This is for learner forms like *sabo*, never shown as correct Spanish.
Each indexed form records all the verbs it can belong to. A form shared by several verbs, or flagged as a homograph, is marked **ambiguous**.

## 4. Ambiguity safeguards
- A small `HOMOGRAPHS` list (vino = venir / wine, era = ser / era, banco, como = comer / like, para = parar / for, sobre, fue = ser / ir, haya). Extend only if tests show a need.
- An ambiguous word can produce MATCH only when the question's context backs one reading. Examples: a subject pronoun or "que" before *vino* points to the verb; a mood trigger present; English hint words ("came" / "wine").
- Without that support the result is CLARIFY when there are two readings and both are covered by cards. It is NEAREST when only one reading has a card, with the reply naming the other meaning.

## 5. Fuzzy matching (supporting evidence only)
- Damerau-Levenshtein, accent-insensitive, only against index forms, never against arbitrary words.
- Allowed: 1 edit for words of 5–7 letters, 2 edits for 8 or more, nothing under 5. Even a perfect fuzzy hit is capped at NEAREST.
- Separation required: the best candidate must be strictly closer than any other verb's candidate. A tie gives CLARIFY or nothing.
- A fuzzy hit becomes MATCH only when a second, independent signal agrees: a mood trigger, an English hint, a comparison partner, or another resolved word pointing to the same card.

## 6. Morphological rules (linguistically defensible only)
- Suffix rules are limited to real Spanish derivations: -miento / -ción → -er / -ar verb (conocimiento → conocer), -ida / -ido participle-nouns (pérdida → perder). Each is accepted only if the resulting infinitive is a card headword *and* the remaining stem is at least 4 letters.
- Prefix stripping (des-, re-) is not used on its own. The result is offered only as NEAREST with the wording "you may be thinking of ...", and only when the stripped word is itself an exact index form. That is how *desperdida* → *pérdida* → perder works. It never yields MATCH.
- Every morphological result must point to an actual card or lesson, or it is dropped.

## 7. Scoring (without incidental boosts)
- The card score is set by the word-recognition layer: explicit/lesson form 1.0, regular fill-in 0.9, wrong-form rule 0.85, morphology 0.6, fuzzy at most 0.7.
- Context bonus only from **strong signals**: mood triggers, English hint words tied to that card, the other verb in a comparison, or the card's own headwords. +0.1 each, at most +0.2.
- Words in example sentences give no bonus. A stop-word list (articles, pronouns, que, de, en, es, se...) is excluded from all matching.
- Thresholds live in one `THRESHOLDS` object. MATCH needs 0.9 or above, a 0.15 lead over the next card, and no ambiguity flag left unresolved. NEAREST covers 0.55 to 0.9. NOT AVAILABLE is below 0.55. Related lessons are suggested only at 0.4 or above, with a one-line reason each, and never as filler.

## 8. User-facing replies
- MATCH: the current answer view, unchanged.
- NEAREST: "This is probably what you mean:" with the best card plus up to 2 alternatives, each with a reason (e.g. "*sabo* → the present of saber is *sé*").
- CLARIFY: the existing option buttons ("Did you mean *vino* = came, or *vino* = wine?").
- NOT AVAILABLE: "That isn't covered in Verb Wise." Related lessons are added only when a card passes the 0.4 bar. Unrelated topics keep today's out-of-scope reply.

## 9. Files
- New: `src/lib/ask/match.ts` (form index, homographs, distance, morphology, scoring, thresholds) and `src/lib/ask/match.test.ts`.
- New, not part of normal test runs: `src/lib/ask/match.bench.ts`.
- Changed: `engine.ts` (calls the matcher, adds the `nearest` result), `verb-forms.ts` (adds the homograph list; existing entries untouched), `AskPanel.tsx` (shows nearest results).
- Not touched: any JSON data, access policy, trial, Stripe, database, routes, paywall, card navigation, keyword search.

## 10. Tests
- **Regression:** all 253 existing tests must keep passing unchanged. Any failure stops the work and gets reported.
- **New tests, all deterministic, one per rule:**
  - conozco / pierdo / supiera → MATCH
  - habia / perdi → MATCH or NEAREST
  - kerer / conosco → NEAREST alone; MATCH only with context
  - sabo / ponido → NEAREST plus the correction
  - pérdida / conocimiento → NEAREST to the right card
  - desperdida → NEAREST to perder, never MATCH
  - cocinar / nadar / desperdiciar → NOT AVAILABLE
  - vino / era / banco alone → never MATCH; "él vino ayer" → venir card
  - "why do I say sé instead of sabo" → saber card
  - perder vs perderse → the right card
  - weather / football → out of scope
  - false-positive guards: es / se, short words, a common word in an unrelated card's example
  - ranking: the expected card comes first
  - a loop over all 100 card infinitives and all accessible lesson `form` labels, each resolving to its own card
- **Access:** locked lesson forms are absent from the index built from public data.
- **Benchmark:** 100 queries timed separately, reported but not a pass/fail test.

## 11. Stages and credits
Balance about 29.70; floor 25, with a hard stop at 25.1.
- **Stage 1, about 3–4 credits (fits today):** form index (sections 3.1–3.3), ambiguity safeguards, fuzzy matching with separation, scoring and thresholds, the NEAREST view, and the core tests plus regression run.
- **Stage 2, about 2–3 credits (after the midnight reset):** regular fill-in (3.4), morphology (section 6), comparison patterns, suggestion reasons, the 100-card and form-label loops, the benchmark.
- **Total:** about 5–7 credits across the two days.
- **Postponed:** "this word doesn't exist" detection (needs a dictionary) and free-form English understanding (needs AI).

## 12. Risks
- Threshold tuning against the full loop may take an extra round. If it would breach 25.1, I stop and report.
- Wrong forms harvested from notes depend on how consistently the notes are worded. Unparseable notes are skipped, not guessed.

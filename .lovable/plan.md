# Generalised "Ask me a question" search: final plan

## 1. What exists today (reused, not rebuilt)
- `normalise.ts`: lowercases text, strips accents, removes fillers, handles self-corrections. Reused as is.
- `verb-forms.ts`: explicit form → infinitive mappings, plus cautious ending guesses that are accepted only when they match a real card headword. This becomes the top-priority layer.
- `engine.ts`: mood and trigger detection, English meaning hints, the card index, the two existing checks, and the `answer | clarify | fallback` results. All kept.
- `useSubjunctive` supplies only content the user is entitled to. The engine works over that data alone.
- Every subjunctive example already labels its verb form, e.g. `"form": "seas (ser)"`. Many notes also name the wrong forms ("Never 'quiero que eres'"). Both are used as search data.

## 2. Limits
- A rule engine handles typos, wrong conjugations, accents and known question patterns. It cannot understand open-ended English beyond its hint rules.
- Without a dictionary it cannot prove a word "doesn't exist". It says "not in Verb Wise" instead. It flags a form as wrong only when a rule or lesson note proves it.

## 3. Form index (built from existing data, not a full conjugation engine)
Built once per dataset, in priority order:
1. **Explicit mappings** in `verb-forms.ts`, which are trusted.
2. **Lesson forms:** every `form` label in the accessible present and imperfect subjunctive examples.
3. **Known wrong forms** taken from lesson notes, marked `wrong` and pointing to the correct form.
4. **Regular forms generated from the card infinitives:**
   - **Which forms:** every person of the present indicative (hablamos, comemos, vivimos), plus preterite, imperfect (hablaban), gerund and participle. This works for -ar, -er and -ir verbs, and reflexive verbs share the forms of their base verb.
   - **Trial run:** across the 155 card infinitives this produced about 2,300 forms. It also showed two real risks, so these guards apply:
   - **Irregular verbs get no regular forms.** A fixed list (ser, ir, estar, haber, tener, hacer, poder, poner, decir, venir, saber, querer, conocer, pedir, perder, and others) is excluded, because regular rules on *ser* produced junk such as "so", "se" and "sido". Their forms come only from layers 1–3. Regular forms of these verbs are kept only as **learner-error** entries (sabo, ponido), never as correct Spanish.
   - **Short and clashing forms are dropped:** anything under 5 letters, anything equal to a stop word, and anything that clashes with an explicit or lesson form.
   - **One verb, several cards:** 243 forms legitimately belong to more than one card (e.g. *estaba* appears on ser-vs-estar and two other cards). Context ranks them, with the card whose verb pair the question names coming first. Without context the result is NEAREST with alternatives, never a silent pick.

## 4. Ambiguity safeguards
- **Homograph list:** a small fixed list of words with two readings (vino, era, banco, como, para, sobre, fue, haya).
- **When MATCH is allowed:** only when context in the question supports one reading — a subject pronoun or "que", a mood trigger, or English hint words.
- **Otherwise:** CLARIFY when both readings have cards. NEAREST when only one does, with the reply naming the other meaning.

## 5. Fuzzy matching (supporting evidence only)
- **Method:** Damerau-Levenshtein distance, accent-insensitive, compared only against forms in the index.
- **Edit limits by word length:**

  | Word length | Edits allowed |
  |---|---|
  | Under 5 letters | none |
  | 5–7 letters | 1 |
  | 8 letters or more | 2 |

- **Confidence cap:** a fuzzy hit on its own reaches NEAREST at most.
- **Separation:** the best candidate must be strictly closer than any other verb's candidate.
- **MATCH:** only when an independent second signal points to the same card.

## 6. Morphology (only rules with a sound linguistic basis)
- **Noun-to-verb endings:** -miento, -ción and -ida/-ido participle-nouns are linked back to their verb. Accepted only when the infinitive is a card headword and the stem is at least 4 letters.
- **Prefixes:** des- and re- are never removed on their own. The result is offered only as NEAREST ("you may be thinking of ..."), and only when the remaining word is an exact form in the index.
- **No card, no result:** anything that doesn't lead to a real card is dropped.

## 7. Scoring (no boosts from incidental words)
- **Base score, by how the word was recognised:**

  | Recognised as | Score |
  |---|---|
  | Explicit or lesson form | 1.0 |
  | Generated regular form | 0.9 |
  | Learner error | 0.85 |
  | Fuzzy match | 0.7 at most |
  | Morphology | 0.6 |

- **Context bonus:** only from strong signals — mood triggers, English hint words tied to the card, a comparison partner, or the card's own headwords. +0.1 each, +0.2 at most.
- **No bonus:** words in example sentences add nothing, and stop words are excluded from matching.
- **Thresholds (in one adjustable `THRESHOLDS` setting):**
  - MATCH needs 0.9 or above, a 0.15 lead, and no ambiguity left unresolved.
  - NEAREST covers 0.55–0.9.
  - NOT AVAILABLE is below 0.55.
  - Related suggestions appear only at 0.4 or above.

## 8. Replies
- **MATCH:** the current answer view, unchanged.
- **NEAREST:** "This is probably what you mean:" with up to 3 cards, each with a reason.
- **CLARIFY:** the existing option buttons.
- **NOT AVAILABLE:** "That isn't covered in Verb Wise." Related lessons appear only when they pass the 0.4 bar.

## 9. Files
- **New:** `src/lib/ask/match.ts` and `src/lib/ask/match.test.ts`.
- **New, optional:** `match.bench.ts`, kept outside the normal test run.
- **Changed:** `engine.ts`, `verb-forms.ts` (adds the homograph and irregular lists; existing entries untouched), `AskPanel.tsx`.

## 10. Tests
- **Regression:** all 253 existing tests must keep passing unchanged. A failure stops the work and gets reported.
- **New tests**, all deterministic:

  | Case | Example input | Expected result |
  |---|---|---|
  | Correct forms | conozco, pierdo, supiera, hablamos, comemos, vivimos, hablaban | MATCH |
  | Missing accents | habia, perdi | MATCH |
  | Spelling errors | kerer, conosco | NEAREST, or MATCH with context |
  | Learner errors | sabo, ponido | NEAREST plus the correction |
  | Related nouns | pérdida, conocimiento | Nearest card |
  | Unlisted verbs | cocinar, nadar, desperdiciar | NOT AVAILABLE |
  | Homographs alone | vino, era, banco | Never MATCH |
  | Homograph with context | "él vino ayer" | venir card |
  | One verb, several cards | estaba on its own | NEAREST with alternatives |
  | Short words | es / se | No false match |
  | Junk regular forms | "sido" | Not linked to ser by rules |
  | Unrelated topics | weather, football | Out of scope |
  | Ranking | each case above | Expected card first |

- **All-cards loop:** every card infinitive and every accessible lesson form resolves to its own card.
- **Access:** locked lesson forms never enter the index.
- **Benchmark:** timed separately, not a pass/fail test.

## 11. Implementation sequence (one coherent feature)
Balance about 29.70. Hard stop at 25.1: no step starts if it risks crossing that.

**First implementation — about 3.5–4.5 credits, includes all of:**
1. Form index: explicit mappings, lesson forms, wrong forms from notes, and regular forms with the guards in section 3.
2. Learner-error rules (sabo → sé, ponido → puesto).
3. Fuzzy matching with the section 5 limits and separation rule.
4. Ambiguity handling: homographs, one verb on several cards, CLARIFY.
5. Scoring, thresholds, nearest-card retrieval with reasons, and the NEAREST view in the panel.
6. Tests from section 10, plus a full run confirming the 253 existing tests still pass.

**Deferred if the budget runs short** — the first item is dropped first:
- Benchmark file.
- New comparison patterns ("X vs Y", "why X and not Y") beyond what the engine already handles.
- Morphology from section 6. Explicit mappings already cover pérdida and conocimiento.

**If credits run low mid-way:** at about 26.0 credits I finish the current step, run the full test suite, then stop and report. No half-built code is left active.

**Postponed entirely:** "this word doesn't exist" detection and free-form English understanding.

**Unchanged:** lesson content, data files, access restrictions, trial, Stripe, paywall, card navigation, and the existing keyword search.

## 12. Risks
- Tuning thresholds against the all-cards loop may need an extra round. That is the main credit risk.
- Wrong forms harvested from lesson notes depend on how consistently the notes are worded. Notes that can't be read reliably are skipped, not guessed.

# Ask Me a Question — natural-language search and voice input

## 1. Current architecture (inspected)
- `/search` is a single-line, debounced keyword filter over `src/data/cards.ts` (100 verb-pair cards from `verbs.json`). No network request; results shown with `CardGrid`.
- Present and imperfect subjunctive: 100 entries each (same IDs as the verb cards), each with triggers in six categories (wish, doubt, emotion, impersonal, conjunction, other) and examples carrying `es`, `en`, `form`, `note`, difficulty.
- The browser only ever gets `subjunctive.public.json` / `imperfect-subjunctive.public.json` (free 20 IDs, Easy only). Full files are server-only; paid content is released by a signed purchase pass via one server function. Policy lives in `content-access.ts`.
- Real lesson routes: `/card/$cardId`, `/subjunctive/present/$entryId`, `/subjunctive/imperfect/$entryId` (locked entries already show the Paywall).

## 2. Data suitability
- Good fit for: ser/estar, por/para, fue/era and the other 97 verb pairs; subjunctive triggers like "quiero que", "no creo que", "espero que", "quería que", conjunctions.
- Gaps to state honestly: there is no dedicated indicative lesson (affirmative "creo que" is only explained inside notes), and coverage of "ojalá + imperfect" must be confirmed during phase 1. Where no entry supports an answer, the engine falls back rather than inventing one.
- No new content library. A small hand-written rule file maps intents (e.g. "negated belief") to the existing trigger categories/phrases; its text is short and generic, the examples always come from the dataset.

## 3. Search and grammar interpretation (no AI, no paid services)
Pipeline, pure functions, used identically for typed and spoken text:
1. Normalise: lowercase, strip accents for matching, remove fillers (um, er, ah, well, like, eh, pues, este), collapse repeated words, keep the last clause after self-corrections ("I mean", "sorry", "o sea"). Never remove: not, never, don't, no, nunca, would, could, wish, think, know, hope, want.
2. Intent detection with explicit rules, English and Spanish:
   - Belief/certainty affirmative (think, believe, know, sure / creo, sé, es cierto) → indicative.
   - Negated belief or doubt (don't think, doubt, not sure / no creo, dudo) → present subjunctive.
   - Desire/hope/emotion with a different subject (want him to, hope he, glad that / quiero que, espero que, me alegra que) → present subjunctive.
   - Past trigger or hypothetical (wanted him to, wish I had, if I were, would / quería que, ojalá + past, si tuviera) → imperfect subjunctive.
   - Verb-pair intents from card titles and side words (to be, for/by, was) → verb card.
   - Tense signals (yesterday, was, used to) separate fue/era and present/past.
3. Retrieval from a prebuilt index (built once at module load, not per keystroke) over titles, side words, triggers, `en`, `es`, `form`, notes; scored by intent match + phrase overlap.

## 4. False-positive prevention — two checks
- Check A (grammar confidence): one intent must clearly outscore others with a conservative threshold; conflicting signals (e.g. "I was" with no context) → clarification instead of an answer.
- Check B (content verification): a real entry/example must exist whose trigger category and phrase match the intent. Keyword-only matches never pass.
- Both pass → answer. A fails → one short clarification question with 2–3 tap options. B fails → fallback ("Sorry, that verb isn't currently listed in Verb Wise." / topic outside current content), optionally a genuinely related lesson.

## 5. Answer presentation
Direct answer line, one Spanish example + English, one-sentence why (from the dataset note or the rule's short text), and an "Open lesson" button to the exact card/entry. "Ask another question" keeps the previous text editable.

## 6. Access control
- Free/trial users: the engine runs entirely in the browser over the public data only; locked examples are not in the browser, so they can't leak. A match on a locked entry shows only its title plus a link to the existing lesson page, which shows the Paywall as today.
- Buyers/creator: the same engine runs in a new server function that reuses the existing signed-pass check and loads full data server-side, returning only the answer fields. One request per submitted question, only for verified buyers.
- No changes to trial, pricing, Stripe, passes or `content-access.ts` rules.

## 7. Voice input
- Browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`), `continuous` + `interimResults`, language toggle en-GB / es-ES.
- Support: Chrome/Edge desktop and Android, Safari iOS/macOS. Firefox and some in-app browsers: unsupported → microphone button replaced by a hint to use keyboard dictation; typing always works.
- 30+ seconds: browsers end sessions after silences or ~60s. On `onend` while the user hasn't pressed Stop, restart automatically; final results are appended to a committed buffer so earlier text is never lost; interim text shown live in the box. Hard stop after ~2 minutes.
- States: ready, listening (pulsing, Stop button), finished, error, permission denied, unsupported. Never auto-submits; user can edit, mix typing and speech, record again.

## 8. Privacy and cost
- Verb Wise never receives, stores or retains audio. Only the text the user submits is processed (in-browser, or by our server for buyers; not logged or stored).
- Chrome/Edge send audio to Google/Microsoft speech services; Safari uses Apple (may be on-device or server). We will not claim on-device processing. A one-line note under the mic plus a short Privacy Policy paragraph.
- No new running costs, no AI APIs, no new packages or database tables.

## 9. Interface
New "Ask me a question" panel at the top of `/search` (existing keyword results stay below) plus a link card on Home. Auto-growing textarea, 1,200-character limit with counter, Submit, mic, language toggle, Clear. Existing styles; minimal animation; works at 320–1280px.

## Technical details — files
New:
- `src/lib/ask/normalise.ts`, `intents.ts` (rules), `index.ts` (search index), `engine.ts` (two checks, result type: answer | clarify | fallback)
- `src/lib/ask/speech.ts` (recognition wrapper with restart/buffer)
- `src/lib/ask.functions.ts` (buyer-only server function reusing the content-pass check; full data loaded via existing `*-full.server.ts`)
- `src/components/app/AskPanel.tsx`, `AskAnswer.tsx`, `MicButton.tsx`
- Tests: `engine.test.ts`, `normalise.test.ts`, `speech.test.ts`, `ask-access.test.ts`
Modified: `src/routes/search.tsx` (add panel, head text), `src/routes/index.tsx` (entry card), `src/routes/privacy.tsx` (speech paragraph), `AGENTS.md` (one rule: ask engine is shared by typed/spoken input and only reads public data in the browser).
Dependencies: none.

## Testing
- Engine: the brief's examples (creo que / no creo que / espero que / sé que / quiero que / ojalá tuviera), ser/estar, por/para, fue/era, present vs past, doubt/certainty/hope, multiple clues; Spanish equivalents; fillers, repeats, self-corrections, unfinished sentences, background noise text, a negation that flips the answer.
- Negative: unknown verb, uncovered topic, misleading keyword, "how do I say I was" → clarify, insufficient context, closest-but-irrelevant card → fallback. Every returned link is checked to exist in the dataset.
- Speech (mocked recognition): restart preserves text, interim/final merge, permission denied, unsupported, error, empty transcript, stop/restart, no auto-submit.
- Access: free answers contain no locked example text; server function returns public tier for forged/missing pass; buyer pass gets full; existing 213 tests unchanged.
- Manual: 30-second spoken English and Spanish on Chrome desktop, Android Chrome, iPhone Safari (needs your device; I can only simulate).

## Phases
1. Data audit of intents vs real entries (confirms ojalá/indicative coverage) + normaliser and rules with tests.
2. Engine with two checks, fallback/clarify, free-tier UI on `/search`.
3. Buyer server function + access tests.
4. Voice wrapper and mic UI.
5. Privacy text, Home entry, responsive checks, full test run.
Risks: rule coverage is finite (some sensible questions will get the fallback by design); speech quality varies by browser and is outside our control.

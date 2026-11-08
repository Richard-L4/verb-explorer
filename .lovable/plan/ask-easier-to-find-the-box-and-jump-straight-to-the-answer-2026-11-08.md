# Ask: easier to find the box, and jump straight to the answer

Layout and scrolling only. Search matching, wording, lessons, access and payments are untouched.

## 1. Make the question box the obvious starting point
- The Ask box becomes the clear first thing on the Search page, directly under the short page title.
- New placeholder: "Type a Spanish word or ask a question..."
- The one-line subtitle under "Ask me a question" is removed (the placeholder now says it), so the box sits higher.
- The box gets a slightly stronger outline and shows a typing cursor on desktop when the page opens. On mobile the keyboard is not opened automatically, because that would cover the screen.
- Ask, Speak and the English/Español switch stay together right under the box. The switch gets a small "Speech language" label so its purpose is clear.
- The "Add Verb Wise to your Home Screen" card appears on every page, so it stays. The Search page simply no longer pushes the box below it on short screens: the page title is tightened so the box shows without scrolling at 1280px and 390px.

## 2. Take the learner straight to the answer
- After Ask is pressed, or a spoken question is submitted, or a "Did you mean" option is tapped, the page scrolls smoothly so the top of the answer sits just below the top bar. If the learner's device prefers reduced motion, it jumps without animation.
- Order inside the answer stays: the main answer or correction first, then the "Not covered" and "Verb or noun?" notes, then the lesson links.
- The empty "Start typing to search" panel below is hidden while an Ask answer is showing, so it doesn't add empty space. It returns when Clear is pressed or the word-search box below is used.

## Checks
- All 286 tests still pass; TypeScript and the preview build reported.
- Screenshots at 1280px and 390px: box visible without scrolling on open; after asking, the answer is in view. No sideways scrolling or console errors.
- Typed question checked in the browser. Spoken question checked with a simulated microphone only; a real microphone can't be tested here.
- Credits checked before starting and stop before the 25.1 floor. Estimated about 1-1.5 credits.

## Files
- src/components/app/AskPanel.tsx (placeholder, subtitle, scroll to answer, language label)
- src/routes/search.tsx (tighter title spacing, hide the empty panel while an answer shows)

## Final audit (run straight after the layout change, same session)
The audit brief assumes the layout change above is already in place. It isn't yet, so the audit runs right after it is built:
- First visit: is it obvious where to type, is the placeholder clear, are Ask, Speak and the language switch understandable, and is the box visible without scrolling.
- Asking: a plain verb question, a misspelling, an off-pack word, a question with several words, and a simulated spoken question. Each answer must land in view.
- Repeated use: a second question, Clear, a "Did you mean" option, switching English/Español, the ordinary word search, and when the empty panel shows or hides.
- At 1280px and 390px: no sideways scrolling, nothing hidden under the top bar, keyboard focus visible, reduced motion respected.
- Tests, TypeScript, preview build log and console errors. Trial, purchases, subjunctive access and lesson links stay unchanged.
- Only real defects are fixed. Other suggestions are listed, not built.
- The report gives pass/fail per section and ends with READY TO PUBLISH or NOT READY TO PUBLISH. Nothing is published.

Total estimate for the layout change and the audit: about 2-3 credits.

## Whole-app release check (last step, after the audit)
Read-only, unless a genuine release blocker is found; any fix is explained.
- Core: landing page, navigation, all 100 cards (examples, translations, tricky notes), Browse and load more, Random, British sayings, Search and Ask.
- Subjunctive: what is locked for visitors and trial users, lifetime access through a test pass only, present and imperfect lessons, quiz categories, question counts and results. Locked content must not be sent to the browser.
- Trial and payments: 7-day trial, the £4.99 checkout opening correctly (no real purchase), restore by email up to sending the code, creator access, and server-side checks of all of these. No customer records are changed.
- Technical: tests, TypeScript, preview build log, console, desktop and mobile, and broken links.
- Security: confirm no secret keys appear in the browser code, access is checked on the server, and trial or purchase records can't be changed from the browser. Database rules and settings are read only, never changed.
- Report: pass/fail per section, blockers, files changed, what could not be verified, credits spent and remaining. Ends with READY TO PUBLISH or NOT READY TO PUBLISH. Nothing is published.

Revised total estimate (layout change, audit and release check): about 4-6 credits, kept well above the 25.1 floor.

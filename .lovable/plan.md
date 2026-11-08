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

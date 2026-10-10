# Add the Quiz to Verb Wise

## What visitors will see

**Menu:** a new **Quiz** tab, styled like the others, opens the Quiz page. It replaces the current "coming soon" page, at the same address.

**Top box on the home page:** the yellow "Coming soon · Quiz" card becomes a clickable green **NEW · Quiz** card. It looks and behaves like the NEW · Subjunctive card, and the label uses the same green. Clicking it opens the Quiz page. All the text on the card changes except the heading "Test what you've learned".

**Subjunctive box on the home page:**
- A **Random Subjunctive** button next to "Explore the subjunctive", styled like the Random Verbs button.
- It opens the existing Random Subjunctive page, so its behaviour and rules stay the same.

**Quiz box on the home page:** a short box in the same style as the Subjunctive and Sayings boxes, with a "Start the quiz" button.

**Quiz page:**
- Three tabs: **Verbs**, **Subjunctive** and **Mix**. Below them, **Easy**, **Medium** and **Hard**, with the same wording and colours as the Subjunctive section.
- One question at a time, with four answer buttons. After you answer:
  - the right and wrong answers are marked
  - the feedback for your choice appears
  - you can't answer that question again
- A **Next question** button, plus progress and score ("Question 3 of 15 · Score 2").
- Questions come in a random order, with no repeats until all the questions in that choice have been used. Then a completion screen shows your final score and a **Restart** button.
- Changing a tab or a level starts a new round using only matching questions. Mix draws from both Verbs and Subjunctive.
- If a choice has no questions available, a clear message appears. Questions from another level or tab are never swapped in.
- Works on phone, tablet and desktop.

## Who can answer which questions

| Visitor | Verbs questions | Subjunctive questions |
|---|---|---|
| Bought Verb Wise | All levels | All levels |
| In the 7-day trial | All levels | Easy only |
| Trial ended, not bought | 20 Easy questions in total, across Verbs and Subjunctive ||

- Locked levels show the existing unlock prompt with the £4.99 price, not the questions.
- **The 20 questions after the trial:** the first 20 Easy questions in the question file's own order, a fixed list. In Mix they come from both categories.
  - **Please confirm:** the file opens with Easy verb questions, so this may give 20 verb questions and no subjunctive ones. Tell me if you want a different split, for example 10 verb and 10 subjunctive.
- Nothing else changes: trial length, purchases, Stripe, Restore by email, creator mode, analytics, and the verb, subjunctive and sayings content.

## The question bank

- Your 100 questions are copied into the app byte for byte and checked: 100 unique IDs, four options each, exactly one right answer.
- No question text is written into the page code.
- Your quiz progress is kept on your device only, separate from your flashcard progress and trial.

## Testing

**Automated tests for:**
- filtering by tab and level, and Mix including both categories
- no repeats until a round is used up
- the empty-choice message
- the three access levels, including exactly 20 Easy questions after the trial
- no Medium or Hard subjunctive questions reaching unpaid visitors

**Browser checks at 390px, 820px and 1280px:**
- the Quiz menu tab, the NEW card and the home-page Quiz box
- answering, feedback, scoring, Next and Restart
- Random Subjunctive

I'll also run the full test suite and a build, and report the results honestly. Nothing will be published.

## Technical details

- **Copy the question file unchanged.** `quiz_questions.json` is copied unchanged to `src/data/quiz.json`, which is server-only. That raw file is never imported in browser code.
- **Generated public file.** A script, `scripts/build-quiz-public.ts`, generates `src/data/quiz.public.json`. It holds all verb questions plus Easy subjunctive questions. Medium and Hard subjunctive questions never ship to the browser.
  - A paid-only server function returns them only for a server-verified purchase pass, the same way paid subjunctive content works now.
- **Access rules.** The rules go in `src/lib/content-access.ts`: `quizQuestionAllowed(q, { paid, inTrial })` and a fixed `FREE_QUIZ_IDS_AFTER_TRIAL` list. The page uses `useAccess()` for trial and paid status, as before.
- **Question order.** A pure helper, `src/lib/quiz-session.ts`, handles filtering and shuffling. It reuses `random-sequence.ts`.
- **New and changed files:**
  - New: `src/routes/quiz.tsx`, rewritten as the playable page
  - New: a `QuizPlayer` component under `src/components/app/`
  - Updated: `nav-items.ts` gets the Quiz tab with the Brain icon
  - Updated: `src/routes/index.tsx` gets the NEW card, the Random Subjunctive button, the Quiz box, and the "Jump back in" Quiz tile text
- **Records.** Save the quiz access rule to memory, and the structure rule for the quiz files to `AGENTS.md`.

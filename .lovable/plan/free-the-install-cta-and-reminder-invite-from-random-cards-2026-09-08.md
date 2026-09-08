# Free the install CTA and reminder invite from Random Cards

Today the panel at the top of the page only ever appears because a Random Cards session was started and then left. That single condition gates both the "Add to Home Screen" step and the daily-reminder invitation. This change replaces that condition with two independent, simpler ones, and touches nothing else.

## New behaviour

**Add to Home Screen CTA**
- Appears at the top of any page away from Home, once the user has actually moved off the Home page during their visit (not on first arrival, not on Home itself, not on Random Cards).
- Not shown to anyone already using Verb Wise from their home screen.
- Shown once: after it is dismissed, installed, or acted on, it does not return.
- If Random Cards was used, the existing "Great! You've studied N cards. 🇪🇸" line still appears above it, exactly as now. Otherwise just the install wording.

**Daily-reminder invitation**
- Offered as soon as Verb Wise is opened and detected as installed on the home screen — on whatever page they land on, including Home. No Random Cards, no page-away requirement.
- Never on first arrival before the install step.
- Never again once the user chooses "Not now", or the browser permission is granted or denied.
- Where installation cannot be detected (iPhone in particular), the invitation still follows the existing rule: at most once, and only after the install step has been passed.

## Deliberately unchanged

Random Cards itself, the studied-card counter, the one-time `InstallBanner`, `install-prompt.ts`, `push-client.ts`, trial logic, Stripe, Creator Mode, test-device protection and funnel analytics. No new install detection and no second reminder-permission path.

## Technical notes

- `src/lib/random-session.ts`: keep every existing key and helper. Add one small piece of state — a "has navigated away from Home this visit" marker (session-scoped) plus an `installCtaPending()` / `reminderInvitePending()` pair that read the existing `INSTALL_STEP_KEY`, `REMINDER_INVITE_KEY` and `POST_STUDY_DISMISSED_KEY` flags. `postStudyPending()` stays, and is folded in as one of the reasons the panel can show, rather than the only one.
- `src/components/app/PostStudyPanel.tsx`: the visibility effect changes from `postStudyPending()` to: show the reminder stage when `isStandalone()` and the invite is still open; otherwise show the install stage when the user is off Home, not on `/random`, not standalone, and the install step has not been completed. The studied-count heading renders only when `studiedCount() > 0`. All existing stage/mode logic, storage writes and copy stay as they are.
- Marking the navigation: done inside the same effect that already watches `pathname`, so no new listeners or components.

## Verification

Install CTA appears after moving from Home to Browse/Search/a card; not on first arrival; not for standalone users; reminder invite appears on next standalone launch on any page; declining or denying stops it returning; Random Cards flow and counter still behave as before; typecheck, tests and build pass.

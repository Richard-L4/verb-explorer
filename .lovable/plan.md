# 7-day trial and a 5-card taste of Random Cards

Two focused changes to the existing trial and Random Cards behaviour. No design, pricing, purchase, creator-mode or analytics changes.

## 1. Trial becomes 7 days

- The trial length setting changes from 14 to 7. Everything else about the trial (start, expiry, purchase, creator and test-device behaviour) stays exactly as it is.
- Countdown reminders switch to 5, 3, 2 and 1 days left, so people don't get a countdown banner on their very first day.
- Wording that mentions "14-day trial" on the privacy page is updated to say 7 days. The refund/cancellation text keeps its own legal "14-day right to cancel" wording — that is a separate legal period and is untouched.

## 2. Random Cards after the trial ends

For someone whose trial has ended and who hasn't bought full access:

- Each visit to Random Cards gives 5 cards, freshly picked at random from the whole deck (not just the free ones), so they get a real taste of the paid feature.
- No duplicates within a set of five, and the selection is not saved anywhere, so returning later gives a different five.
- After the fifth card, a short message appears with the existing "Buy now" link. They can start another fresh five at any time.

During an active trial, for paying customers, and in creator mode, Random Cards keeps working exactly as it does today with no limit.

The existing free cards remain available everywhere else as they are now — this limit applies only inside Random Cards.

## Technical notes

- `TRIAL_DAYS` in `src/lib/access.ts` goes 14 → 7. It is the single source of truth; `trialDaysLeft`, `trialActive`, `endTrial` and the server trial sync all derive from it, so no other numeric change is needed.
- Reminder day list `[7, 3, 2, 1]` in `src/components/app/TrialBanner.tsx` (both the display and the analytics effect) becomes `[5, 3, 2, 1]`, with the matching copy in `reminderFor`. The creator-only banner preview options in Settings are updated to the same set, and the `BannerPreview` type in `access.ts` follows. Event names stay `reminder_5`/`reminder_3`/`reminder_2`/`reminder_1` in the existing `reminder_*` shape; no analytics plumbing changes.
- `src/routes/random.tsx`: derive a `limited` flag from `useAccess()` (`!fullAccess`, i.e. trial expired and not unlocked/creator). When limited, build the queue as a 5-item shuffle over the full `cards` list instead of the unlocked-only list, don't extend the queue on `next`, and render a short end-of-set panel with the existing `/unlock` link styling. When not limited, the current behaviour is unchanged.
- Nothing about the queue is persisted; it lives in component state only, so each entry re-shuffles. `markRandomStudied` / `armPostStudyPanel` behaviour is unchanged.
- Update `src/lib/access.test.ts` expectations (14 → 7) and `TrialBanner.test.tsx` reminder-day cases; run typecheck, tests and build.

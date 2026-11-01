<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Trial input validation lives in `trial-input.ts`: preserve the collector's eight string fields and reject unknown keys before Zod parsing, so malformed device records cannot accumulate unbounded validation issues.
- Content access policy lives only in `src/lib/content-access.ts`; pages call it instead of writing their own rules, so the policy stays consistent.
- `src/data/subjunctive.json` is imported only by `src/lib/subjunctive-full.server.ts`, which is loaded dynamically inside server handlers; the browser uses the generated `subjunctive.public.json` (regenerate with `bun ./scripts/build-subjunctive-public.ts`), so locked examples never ship to the client.
- Paid subjunctive content is released only for a server-signed purchase pass (`content-pass.server.ts`) whose purchase is re-checked in the database; the local `unlocked` flag never authorises protected content.
- Creator mode is server-validated: `?creator=` is stripped from the URL and checked against the server-only `CREATOR_ACCESS_KEY` (`creator.functions.ts`), which issues a 30-day creator pass bound to a key fingerprint; never put a creator code in client code.
- Restore by email requires a one-time emailed code (`restore.server.ts`, table `restore_codes`); only HMACs of emails, codes and networks are stored, and replies never reveal purchase status.
- The visitor network address comes only from `client-address.server.ts` (Cloudflare `cf-connecting-ip`); browser-supplied forwarding headers are never trusted, because clients can forge them.
- Funnel events are recorded only from production hostnames (`isProductionAnalyticsHost` in `analytics.server.ts`); preview and workspace copies share the production database, so they must never write analytics.
- Funnel display corrections live in `funnel-exclusions.server.ts` and are applied only on the read path; `trial_events` rows are never deleted or edited, so raw history stays intact.
- The quiz bank `src/data/quiz.json` is imported only by `src/lib/quiz-full.server.ts`; the browser gets the generated `quiz.public.json` (fixed 20 after-trial questions; regenerate with `bun scripts/build-quiz-public.ts`), and `getQuizQuestions` decides the tier on the server from a signed pass or the `vw_vid` trial record, so restricted questions never ship to the browser.
- Subjunctive tenses share one access policy and one signed-pass server function; `imperfect-subjunctive.json` is imported only by `imperfect-subjunctive-full.server.ts` and the browser gets the generated `imperfect-subjunctive.public.json`, so locked imperfect examples never ship to the client.
- Which subjunctive quiz questions are imperfect is decided only by `IMPERFECT_QUIZ_IDS` in `src/lib/quiz-tense.ts`, because the bank itself carries no tense field.
- Reminder subscriptions can be changed or cancelled only by their owner: an HttpOnly cookie holds an HMAC of the address under the dedicated `REMINDER_OWNER_SECRET` (`push-owner.server.ts`, no fallback secret), and older rows prove ownership with their stored delivery keys.
- Payment and email code logs errors only through `log-safety.server.ts` (`safeError`/`redact`/`maskEmail`), never raw provider bodies or error objects, so customer emails stay out of logs.
- A purchase is recorded or unlocked only after `fetchVerifiedVerbWiseSession` re-fetches the session from Stripe and confirms exactly one Verb Wise price, GBP, paid and complete, so other paid sessions in the account never grant access.
- Browser analytics events are accepted only with a valid server-issued `vw_vid` trial cookie and a today/yesterday date; checkout and purchase events are server-recorded only, so anonymous callers cannot add funnel activity.
- A Stripe payment reference grants a new pass only through the atomic `claim_purchase` database function (`purchase-claim.server.ts`), bound to an HttpOnly checkout marker with a short same-browser retry window; other devices use Restore by email, so a leaked success link cannot unlock other browsers.
- "Ask me a question" (`src/lib/ask/`) interprets typed and spoken text with one local rule engine fed only the content the browser is already entitled to (`useSubjunctive`), and answers only when a recognised intent is backed by a real entry; dictation (`speech.ts`) is kept separate, so no AI service, extra server call or locked content is involved.

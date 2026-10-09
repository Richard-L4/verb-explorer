# Random dropdown, Random Subjunctive and revised access policy

Decisions already agreed: free entries show the **3 Easy examples per entry** (the data has one Easy, one Medium and one Hard example per trigger, so 9 Easy examples per entry doesn't exist); locked examples are **protected on the server**; the free 20 are the **first 20 in deck order**.

## 1. What exists today (inspected)

- **Navigation** (`nav-items.ts`, `AppShell.tsx`): Home, Browse, Subjunctive, Sayings, Search, Favourites, Statistics, Settings. There is **no "Random Cards" item in the top navigation**. Random Cards is only a button on the Home page that opens `/random`.
- **One access rule for everything** (`use-access.ts` → `isLocked(id)`): unlocked if purchased, creator, or in the 7-day trial. Otherwise only the IDs of the first 10 verb cards are free. Verb cards, Sayings and Subjunctive all use this same check, so after the trial Sayings and Subjunctive are fully locked, and 90 verb cards are locked.
- **Random Cards** (`random.tsx`): shuffles once per visit, then adds a fresh shuffle when the run ends. Expired, unpaid users get a 5-card taster.
- **Purchases**: Stripe Checkout → `confirmCheckout` records the purchase in the database → the browser saves `unlocked: true` locally. "Restore purchase" checks the email on the server and sets the same local flag. **The server never sees proof of purchase on later visits**. The app only trusts the browser's local flag.
- **Subjunctive data**: `subjunctive.ts` imports the whole `subjunctive.json`, so **every entry, trigger and example (all difficulties) is sent to every visitor's browser** today. Hiding on screen can't protect it.

### Conflicts with the new policy
- The trial currently unlocks all Subjunctive content. Under the new policy the trial unlocks nothing extra in Subjunctive: Medium and Hard stay locked, and only the free 20 have Easy content.
- The first-10 verb rule and the 5-card Random taster both go, because all verbs become free.
- Sayings must keep today's behaviour, so the existing `isLocked` stays and is used only for Sayings.

## 2. Navigation dropdown
- Add a **"Random"** item (Shuffle icon) to the top navigation, after Sayings. It opens a small menu with **Random Verbs** (`/random`) and **Random Subjunctive** (`/random-subjunctive`). It's built with the project's existing accessible dropdown menu component, so it works with the keyboard (Enter/Space/arrow keys/Esc), matches the pill styling and lights up when either page is open.
- Mobile menu: the two options appear as normal links in the list. The menu closes after a choice, like the other links.
- The Home page "Random Cards" button is renamed **Random Verbs** and keeps the same place and style.

## 3. Random Verbs (`/random`, same layout)
- Page title and badge renamed to "Random Verbs". The pool is always all 100 cards.
- The deck is shuffled once when a session starts. Next walks through it with no repeats until all 100 have been seen. Then a fresh shuffle is added, arranged so its first card is never the card just shown. Previous goes back through the cards already seen.
- The 5-card taster and its buy prompt are removed.

## 4. Random Subjunctive (`/random-subjunctive`)
- One entry at a time, using the same trigger tabs and example layout as the Subjunctive detail page (shared component taken out of the detail page).
- **Pool**: without a purchase, only the 20 free entries. The other 80 are never in the list being shuffled. With a confirmed purchase, all 100.
- It uses the same shuffle-once / no-repeat-until-exhausted / Previous-Next logic as Random Verbs (one shared helper), with its own separate sequence.
- For each trigger, the Easy example is shown. Medium and Hard show a level badge with a locked panel ("Medium and Hard examples come with full access — £4.99") for unpaid users, or the real examples once a purchase is confirmed.

## 5. The 20 free entries (fixed, deck order)
ser-vs-estar, fue-vs-era, por-vs-para, saber-vs-conocer, salir-vs-quedar, llevar-vs-hacer, pedir-vs-preguntar, poder-vs-saber, deber-vs-tener-que, ir-vs-venir, traer-vs-llevar, querer-vs-amar, mirar-vs-ver, escuchar-vs-oir, acordarse-vs-recordar, sentir-vs-sentirse, pensar-vs-creer, gastar-vs-pasar, hablar-vs-decir, encontrar-vs-buscar.

These are stored as a fixed list of IDs (not "first 20 at runtime"), so the free set can't change later without anyone noticing.

## 6. One shared access policy
A new `content-access` module answers every question in one place:
- `verbCardOpen(id)` → always true.
- `subjunctiveEasyOpen(id)` → true for the free 20, or with a confirmed purchase.
- `subjunctiveLevelOpen(id, difficulty)` → Easy follows the rule above. Medium and Hard need a confirmed purchase (trial ignored).
- `sayingLocked(id)` → today's rule, unchanged.

Browse, Search, card pages, Subjunctive list/search/detail, Random Verbs and Random Subjunctive all call this module. The Subjunctive list shows a locked badge on the 80. Their detail pages show the title and a "Requires full access" panel with the existing Paywall. Medium/Hard tabs show their labels but no content.

## 7. Protecting the content (server-side)
- **Browser copy**: a derived file `subjunctive.public.json` is generated from the original by a small script. It holds titles for all 100, plus triggers, explanations and **Easy examples only** for the free 20. The original `subjunctive.json` is left untouched and is only read on the server. A test checks that the public file matches the original exactly and contains nothing locked.
- **Paid content**: a server function `getSubjunctiveContent(entryId)` returns locked content only when the request carries a valid **purchase pass**. A purchase pass is a signed token issued by the server when `confirmCheckout` or Restore succeeds. It's saved in the browser alongside the existing flag and checked with a new server-only secret (`CONTENT_PASS_SECRET`, created securely, never shown or put in the code). Changing the URL, the difficulty, reloading or using Random doesn't help, because the server decides what to return.
- **Creator mode**: the server issues a pass when the existing creator key is presented. Creator mode itself is unchanged.
- **Infrastructure**: no new services, tables or costs. It uses the existing server functions and the existing purchases table.

## 8. Existing purchases and Stripe
Prices, Stripe products, checkout, webhook and purchase records are unchanged. Verbs and Sayings keep using the existing local unlock flag. **Risk**: browsers that bought before this change have the flag but no pass. They see a one-time "Confirm your purchase" panel on locked Subjunctive content, which uses the existing Restore-by-email to fetch a pass. Purchases made after the change get the pass automatically.

## 9. Files
- New: `src/lib/content-access.ts`, `src/lib/random-sequence.ts`, `src/lib/content-pass.server.ts`, `src/lib/subjunctive-content.functions.ts`, `src/data/subjunctive.public.json` (+ generator script), `src/routes/random-subjunctive.tsx`, `src/components/app/SubjunctiveEntryView.tsx`, `src/components/app/RandomMenu.tsx`.
- Changed: `nav-items.ts`, `AppShell.tsx`, `use-access.ts` (exposes `paid` vs `trial` separately), `random.tsx`, `routes/index.tsx` (button label), `subjunctive.ts`, `subjunctive.index.tsx`, `subjunctive.$entryId.tsx`, `card.$cardId.tsx`, `CardGrid.tsx`, `checkout.functions.ts`, `RestorePurchase.tsx`, `unlock_.success.tsx` (store pass), `Paywall.tsx` copy only if needed.
- Unchanged: both JSON datasets, Sayings rules, trial length/tracking/reminders, analytics, Stripe.

## 10. Tests
- Access: all 100 verbs open for never-trialled, in-trial and expired users. The free list equals the 20 IDs above. Easy is open for the free 20 only when unpaid. Medium and Hard stay locked in trial, after expiry and for free entries, and open when paid. Sayings unchanged.
- Random sequence: no duplicates before exhaustion (100 and 20), no reshuffle on Next, Previous/Next correct, no repeat across the run boundary. The unpaid Random Subjunctive pool equals exactly the free 20.
- Public data: contains no Medium/Hard examples and nothing from the 80 apart from titles. Matches the original.
- Server: no pass / bad pass → no locked content. Valid pass → full entry.
- Existing 44 tests, type check, and browser checks at phone/tablet/desktop (dropdown, keyboard, both random pages, direct URLs, no sideways scrolling).

## Assumptions needing your OK
- "Random" sits as a new top-navigation item, since none exists today.
- The 5-card taster is removed because all verbs become free.
- Earlier buyers confirm once by email to see Medium/Hard examples.

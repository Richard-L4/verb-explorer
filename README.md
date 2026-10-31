# Verb Wise — A Guided Tour of the Codebase

Verb Wise is a full-stack web app for learning Spanish verb contrasts with
interactive cards, quizzes, sayings and subjunctive lessons. This guide is
written for someone learning React and modern web development: it explains
how the project is organised and how a request travels through the app.

## The big picture: how a page is built

When you open Verb Wise, this is the journey your request takes:

```
Your browser
   │  1. asks for a page (e.g. /browse)
   ▼
TanStack Start server (src/server.ts)
   │  2. matches the URL to a route file and renders the React page
   ▼
React frontend (src/routes, src/components)
   │  3. the page loads in the browser and becomes interactive
   │  4. when it needs private data or must change something, it calls a
   │     "server function" — a function that runs only on the server
   ▼
Server functions (src/lib/*.functions.ts)
   │  5. check who you are (trial cookie, purchase pass, creator key)
   │  6. talk to the database, Stripe or the email service
   ▼
Supabase (database) / Stripe (payments) / Resend (email)
   │  7. the result travels back to the browser and the page updates
```

The most important idea in this project is the **browser/server split**:

- **Browser code** (routes, components, hooks, most of `src/lib`) runs on the
  visitor's device. Anyone can read it, so it must never contain secrets or
  trusted decisions.
- **Server code** (files ending in `.server.ts`, `.functions.ts`, and
  everything under `src/routes/api/`) runs only on the server. It can safely
  hold secrets (database keys, Stripe keys) and make final decisions about
  what a visitor is allowed to see.

That is why, for example, the full quiz question bank lives in a
`.server.ts` file: the browser only ever receives the questions the visitor
is actually entitled to.

## Folder guide

| Folder | What lives here |
| --- | --- |
| `src/routes/` | One file per page URL. TanStack Router turns `src/routes/browse.tsx` into the `/browse` page automatically. |
| `src/routes/api/` | HTTP endpoints for things that are not pages: the Stripe webhook and the daily reminder sender. |
| `src/components/app/` | The app's own React components (cards, banners, quiz player, paywall…). |
| `src/components/ui/` | Third-party shadcn/ui building blocks (buttons, dialogs…). These are library files — you rarely need to read them. |
| `src/hooks/` | Custom React hooks — reusable pieces of stateful logic shared by pages. |
| `src/lib/` | The "brains". Browser helpers, server-only modules (`.server.ts`) and server functions (`.functions.ts`) live side by side; the file suffix tells you where the code runs. |
| `src/data/` | Card, saying and subjunctive content. Some data is public; master files are imported only by server modules so locked content never reaches the browser. |
| `scripts/` | One-off build scripts that generate the public (browser-safe) JSON data files. |
| `db/` | SQL migration files, run by hand in the database console. |
| `public/` | Static files served as-is (icons, the service worker, the web app manifest). |

## Key files to read first

1. `src/router.tsx` — creates the router that ties all routes together.
2. `src/routes/__root.tsx` — the layout wrapped around every page.
3. `src/routes/index.tsx` — the home page.
4. `src/hooks/use-learner.ts` — how favourites and learned cards are tracked
   in the browser's local storage.
5. `src/lib/content-access.ts` — the single place that decides what free,
   trial and paid visitors may see.
6. `src/lib/checkout.functions.ts` — how buying the lifetime unlock works.
7. `src/lib/trial.server.ts` — how the 7-day trial is enforced on the server.

## How the main features fit together

- **Cards, Sayings, Subjunctive** — content lives in `src/data/`; pages in
  `src/routes/` render it through components in `src/components/app/`.
- **Trial** — the server issues a signed trial cookie (`vw_vid`); the banner
  and paywall read the trial state, but the server always has the final say.
- **Payments** — the Unlock page calls a server function that creates a
  Stripe Checkout session. Stripe later calls back via the webhook in
  `src/routes/api/public/stripe-webhook.ts`, and only then is a purchase
  recorded. The browser is never trusted to say "I paid".
- **Restore by email** — proves a purchase on a new device with a one-time
  emailed code; only hashes of emails and codes are stored.
- **Reminders** — push subscriptions are stored in the database and a
  scheduled job calls `src/routes/api/public/send-daily-reminders.ts`.
- **Funnel analytics** — anonymous visit/trial events, written only from the
  production site and viewable only in creator mode.

## Running the project

```bash
bun install        # install dependencies
bun run dev        # start the local dev server
bun run test       # run the automated tests
bun run build      # create a production build
```

## A note on the comments

Throughout the source you will find educational comments explaining what each
file does, why security decisions were made, and how React features (state,
props, hooks, effects) are being used. They are there to help you learn —
the code works exactly the same with or without them.

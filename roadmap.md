# Verb Wise roadmap

- [x] Part 1 — Lovable Preview auto-activates existing creator mode
- [ ] Part 2 — one-time delete of 9 reminder/expiry rows (awaiting confirmation)
- [ ] Part 3 — server-side trial entitlement
  - [ ] durable server-issued HttpOnly opaque cookie as primary identity
  - [ ] trial_grants table keyed by that identity
  - [ ] secondary one-way salted hash of network address (never raw, never exposed)
  - [ ] trial_started logged only after the server accepts a first trial
  - [ ] preserve test-device protection + creator mode
- [x] Promotional popup — 7-day trial / £4.99 offer
- [x] Subjunctive section (nav, landing box, list, detail, access, validation, tests)
- [x] Random dropdown (Random Verbs / Random Subjunctive), all verbs free, 20 free Easy subjunctive entries, server-protected paid content
- [ ] Pre-publish security: secure creator access + verified restore (waiting on db/restore_codes.sql being run in Supabase, then final creator/restore browser checks)
- [x] Generalised Ask search — frame parsing, verified morphology, off-pack vocabulary, composite answers, regression tests and UI verification
- [x] Sayings expanded to 75 English expressions (British, American, Canadian) with regression checks

- [x] Host-guarded Stripe live/test key and price selection (trusted host, separate webhook tests)

- [~] £19.99 lifetime price + new product description — ABANDONED 2026-11-16: Richard decided to keep Verb Wise at £14.99 lifetime. No £19.99 code, prices or UI were ever implemented; the £14.99 implementation stands unchanged. Do not create £19.99 Stripe prices.

- [x] Navigation: Settings reachable, Buy It Now (/unlock), More dropdown on desktop
- [x] Revised access model: 7-day trial = everything; after trial free SER vs ESTAR collection only; rest £14.99 (7 stages, reserve 25.1 credits)
- [x] Investigate automatic preview Unlock and verify manual genuine £14.99 Stripe test checkout without changing access or production.

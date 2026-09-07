# Verb Wise roadmap

- [x] Part 1 — Lovable Preview auto-activates existing creator mode
- [ ] Part 2 — one-time delete of 9 reminder/expiry rows (awaiting confirmation)
- [ ] Part 3 — server-side trial entitlement
  - [ ] durable server-issued HttpOnly opaque cookie as primary identity
  - [ ] trial_grants table keyed by that identity
  - [ ] secondary one-way salted hash of network address (never raw, never exposed)
  - [ ] trial_started logged only after the server accepts a first trial
  - [ ] preserve test-device protection + creator mode

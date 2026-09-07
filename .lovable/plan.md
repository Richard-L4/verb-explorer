# Revised anti-abuse design: per-device, not per-network

## Why the current rule cannot work

The current rule counts trials per network address. A network address cannot tell
"the same person in Incognito" apart from "a fourth person in the same house" — both look
identical to the server. So any network cap either blocks housemates (cap 1-2) or lets the
same person restart at will (cap 4+). The dial has no good setting. It must be replaced.

## What actually distinguishes the two cases

| Case | Same device? | Same network? |
|---|---|---|
| Same person, Incognito | yes | yes |
| Same person, cleared storage | yes | yes |
| Same person, different browser | yes | yes |
| Four housemates | **no** | yes |

The reliable signal is the **device**, not the network. The three loopholes you named all
happen on one device; genuine housemates each use their own phone or laptop.

## Proposed design

Three layers, strongest first.

**1. Server-issued cookie (already built, unchanged).**
Handles the normal case. Fast, exact, no signal needed.

**2. Device signal (new).**
When there is no cookie, the browser sends a small set of stable, non-personal device
characteristics. The server combines them with the salted network value and stores only a
one-way hash. If that hash already has a trial, the visitor inherits the existing clock
instead of starting a new one — access is never blocked, the days simply do not reset.

Characteristics used: screen dimensions and pixel ratio, timezone, language, platform
string, hardware concurrency, memory class, touch support. These are the same values every
website already receives in normal operation.

**3. Network velocity limit (replaces the lifetime cap).**
The lifetime per-network cap is removed entirely. In its place, a rolling limit — for
example, more than 8 new trials from one network in 24 hours — marks further grants as
suspected and makes them inherit rather than restart. A real household never reaches that;
a scripted attack does.

`NETWORK_GRANT_ALLOWANCE = 2` is deleted.

## What this achieves

- Four, six or ten people in one house each get a full trial, because each has a different device.
- Incognito on a device that already had a trial: same device signal, clock inherited, no new
  `trial_started`.
- Cleared site data: same result.
- A different browser on the same device: same result, as long as the characteristics match.

## Honest limitations

- **Two identical devices, same house, same settings** (e.g. two iPhone 15s on the same Wi-Fi,
  same language and timezone) can collide. The second person inherits the first person's clock.
  Mitigation: include enough characteristics that identical-model collisions are uncommon, and
  never block — the person still has full access to the app, just fewer trial days. A support
  route ("my trial looks wrong") stays possible.
- **The same person on a second device** (phone after laptop) gets a fresh trial. Closing that
  needs an account, which is out of scope here.
- **Privacy trade-off, stated plainly:** this is a light device fingerprint. Nothing personal
  is collected — no name, email, IP, advertising ID or canvas/font probing — and only a salted
  one-way hash is stored, which cannot be reversed or matched across sites. But it is a
  behavioural identifier and the privacy page must say so. If you would rather not fingerprint
  at all, the only equally strong alternative is requiring an email address to start the trial.

## Technical changes

- `src/lib/trial.server.ts`: remove `NETWORK_GRANT_ALLOWANCE`; add `hashDevice(signal, address)`;
  `claimTrial` gains a `device` input and looks up `device_hash` before deciding; add a rolling
  24-hour network count used only as a velocity guard.
- `src/lib/trial.functions.ts`: accept a `device` payload from the browser and pass it through.
- New `src/lib/device-signal.ts`: browser-side collection of the characteristics above,
  returned as a plain object; no storage, no third party.
- `src/lib/trial.ts`: collect the signal before calling the server function.
- Database: add `device_hash text` and an index to `public.trial_grants`; keep `network_hash`
  for the velocity guard only. Delivered as a SQL file you apply, as before.
- `src/routes/privacy.tsx`: one sentence describing the device signal and its purpose.
- Untouched: trial length, reminders, funnel event meanings, Creator Mode, test-device
  protection, Stripe, pricing, UI.

## Before implementing

The temporary `/api/public/trial-check` endpoint stays until this is verified, then is removed.
Test sequence after publish: normal browser gets a trial; Incognito on the same device inherits
it and records no new `trial_started`; a second physical device on the same Wi-Fi gets its own
full trial.

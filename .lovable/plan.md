# Read-only assessment of the four trial grants

## What I can answer now, without any change

**What the live diagnostic already proves**

- The server saw a network address, could read the grants table, and found exactly
  **1** existing grant on your current network.
- The allowance is **2**, so the rule said "this network may start 2 separate trials".
  One existing grant is below the limit, therefore the Incognito visit was granted a
  fresh trial *by design*. Nothing failed.

**What I cannot answer without a small read-only addition**

The exact `created_at` / `trial_started_at` timestamps of the four rows, and how they
group by network, are not visible from anything currently deployed. This environment has
no direct database access, and the existing diagnostic reports only counts for the
*current* request. So the following three questions need one more read-only report:

- the four timestamps,
- how many of the four share your current network (count only, hash never shown),
- whether any grant predates the new system going live.

## Proposed step (read-only, no behaviour change)

Extend the existing temporary endpoint `src/routes/api/public/trial-check.ts` with a
`grants` list containing, per row: `trialStartedAt`, `createdAt`, `repeatSuspected`, and
`sameNetworkAsThisRequest` (true/false). No hash, no cookie value, no IP, no credential.
It stays strictly read-only: no insert, no cookie issued, no analytics.

That single output answers all three outstanding questions at once:

- **Do the four correspond to our tests?** The timestamps will either cluster around the
  publish and Incognito tests, or they will not.
- **Any grant from before publish?** A `created_at` earlier than the publish time proves it.
  The table was created for this system, so a pre-publish row is unlikely but must be shown,
  not assumed.

## The allowance question, answered now

Changing `NETWORK_GRANT_ALLOWANCE` from **2** to **1**:

```text
allowance = 2   first browser -> new trial      second browser -> new trial
                third browser -> inherits the oldest clock

allowance = 1   first browser -> new trial      second browser -> inherits the oldest clock
```

With 1, the second cookie-less visitor on a network does **not** get a fresh 14 days. They
still get access, but on the *existing* clock, and no second `trial_started` is recorded.
That closes both loopholes you named: Incognito and cleared site data.

**The trade-off, precisely**

- Gain: one network = one trial period. Incognito and storage-clearing stop buying extra days.
- Cost: two genuinely different people behind the same public address — a household, a
  couple sharing broadband, an office, a school, a coffee shop, or anyone on carrier-grade
  NAT or a VPN — share one trial window. The second person is not blocked, but if the first
  person's trial started 12 days ago the second sees only 2 days left.
- Mobile networks are the sharpest edge: carrier NAT can put thousands of unrelated phones
  behind one address, so on mobile an allowance of 1 can shorten trials for people who have
  never visited before.

There is no setting that separates "same person again" from "different person, same router"
using a network address alone — that distinction is exactly what the address cannot carry.
The allowance is the dial between the two failure modes.

**Middle options, if you want them later**

- Keep 2, but make the second grant on a network *inherit* rather than restart the clock
  (stricter than today, softer than 1).
- Set 1 but expire the network signal after, say, 30 days, so a shared network is not
  permanently spent.

No change is made in this step.

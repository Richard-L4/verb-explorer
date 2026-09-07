-- Adds the per-device trial signal. Run manually in the Supabase SQL Editor
-- after db/trial_grants.sql.
--
-- Privacy: `device_hash` is a salted one-way SHA-256 of a small set of stable,
-- non-personal device characteristics combined with the network value. It
-- cannot be reversed and cannot be matched across other sites.

alter table public.trial_grants
  add column if not exists device_hash text;

create index if not exists trial_grants_device_hash_idx
  on public.trial_grants (device_hash);

-- Used by the rolling 24-hour velocity guard.
create index if not exists trial_grants_network_created_idx
  on public.trial_grants (network_hash, created_at);

-- Server-side trial entitlement. Run manually in the Supabase SQL Editor
-- (same pattern as supabase/migrations/trial_events.sql).
--
-- Creates ONE new table. Does not touch trial_events, customers, purchases,
-- products, prices or communication_preferences.
--
-- Privacy: no IP address, no personal data. `token_hash` is a SHA-256 of a
-- random server-issued opaque cookie value; `network_hash` is a salted,
-- one-way SHA-256 of the request network address and cannot be reversed.

create table if not exists public.trial_grants (
  id               uuid primary key default gen_random_uuid(),
  token_hash       text        not null unique,
  network_hash     text,
  trial_started_at timestamptz not null default now(),
  repeat_suspected boolean     not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists trial_grants_network_hash_idx
  on public.trial_grants (network_hash);

-- Service role only: the browser never reads or writes this table.
alter table public.trial_grants enable row level security;

revoke all on public.trial_grants from anon, authenticated;
grant all on public.trial_grants to service_role;

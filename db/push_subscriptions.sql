-- Daily reminder delivery targets. Run manually in the Supabase SQL Editor.
--
-- Creates ONE new table. Does not touch trial_events, trial_grants, customers,
-- purchases, products, prices or communication_preferences.
--
-- Privacy: only the technical values the Web Push protocol needs to deliver a
-- notification. No name, email, phone number, IP address or advertising ID.

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  endpoint     text        not null unique,
  p256dh       text        not null,
  auth         text        not null,
  active       boolean     not null default true,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_active_idx
  on public.push_subscriptions (active);

-- Service role only: the browser never reads or writes this table directly.
alter table public.push_subscriptions enable row level security;

revoke all on public.push_subscriptions from anon, authenticated;
grant all on public.push_subscriptions to service_role;

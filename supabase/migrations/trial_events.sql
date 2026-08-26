-- Anonymous trial-funnel analytics. Run manually in the Supabase SQL Editor.
-- Creates ONE new table. Does not touch customers, purchases, products,
-- prices or communication_preferences.

create table if not exists public.trial_events (
  id          uuid primary key default gen_random_uuid(),
  device_id   text        not null,
  event       text        not null,
  trial_day   integer,
  occurred_at timestamptz not null default now(),
  occurred_on date        not null default (now()::date),
  constraint trial_events_event_check check (event in (
    'app_visit','trial_started','reminder_7','reminder_3','reminder_2',
    'reminder_1','trial_expired','checkout_started','purchase_completed'
  ))
);

-- De-duplication target used by the server writer (one row per device, event, day).
create unique index if not exists trial_events_device_event_day_idx
  on public.trial_events (device_id, event, occurred_on);

-- Efficient funnel counts.
create index if not exists trial_events_event_idx on public.trial_events (event);

-- Service role only: the browser never reads or writes this table.
alter table public.trial_events enable row level security;

revoke all on public.trial_events from anon, authenticated;
grant all on public.trial_events to service_role;

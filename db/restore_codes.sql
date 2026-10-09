-- Verified Restore-by-email codes and creator-attempt rate limiting.
-- Run manually ONCE in the Supabase SQL Editor. Creates ONE new table and
-- does not touch any existing table.
--
-- Privacy: no email addresses, codes or IP addresses are stored — only
-- one-way HMACs keyed with the server-only CONTENT_PASS_SECRET.

create table if not exists public.restore_codes (
  id           uuid        primary key default gen_random_uuid(),
  purpose      text        not null check (purpose in ('restore', 'creator')),
  email_hash   text,
  code_hash    text,
  network_hash text,
  attempts     integer     not null default 0,
  expires_at   timestamptz not null,
  used_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists restore_codes_email_idx
  on public.restore_codes (purpose, email_hash, created_at desc);
create index if not exists restore_codes_network_idx
  on public.restore_codes (purpose, network_hash, created_at desc);

-- Service role only: the browser never reads or writes this table.
alter table public.restore_codes enable row level security;

revoke all on public.restore_codes from anon, authenticated;
grant all on public.restore_codes to service_role;

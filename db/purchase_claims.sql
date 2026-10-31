-- One-time claiming of Stripe payment references.
-- Run once in the Supabase SQL Editor BEFORE publishing the matching app version.
-- All-or-nothing: any error rolls back every statement.

begin;

-- Fail fast instead of queueing behind live traffic; rerun if it times out.
set local lock_timeout = '5s';

-- Hold the table exclusively until COMMIT: no inserts or updates can slip in
-- between the duplicate check and the end of the migration.
lock table public.purchases in access exclusive mode;

-- 1. Safety check (runs under the lock): stop if any payment reference repeats.
do $$
begin
  if exists (
    select 1 from public.purchases
    where stripe_checkout_session_id is not null
    group by stripe_checkout_session_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate stripe_checkout_session_id values found; migration aborted, nothing changed.';
  end if;
end $$;

-- 2. Guarantee one row per payment reference (multiple NULLs allowed).
do $$
begin
  -- Accept existing protection only if it is a valid, ready, plain,
  -- single-column unique index on stripe_checkout_session_id.
  if exists (
    select 1
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
    where i.indrelid = 'public.purchases'::regclass
      and i.indisunique
      and i.indisvalid
      and i.indisready
      and i.indnatts = 1
      and i.indpred is null
      and i.indexprs is null
      and a.attname = 'stripe_checkout_session_id'
  ) then
    return;
  end if;

  -- The name is taken by something that is not the required index:
  -- stop safely; never drop or replace without approval.
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'purchases_stripe_checkout_session_id_uniq'
  ) then
    raise exception 'public.purchases_stripe_checkout_session_id_uniq exists but is not a valid single-column unique index on purchases.stripe_checkout_session_id; migration aborted, nothing changed.';
  end if;

  create unique index purchases_stripe_checkout_session_id_uniq
    on public.purchases (stripe_checkout_session_id);
end $$;

-- 3. Claim columns.
alter table public.purchases
  add column if not exists claimed_at timestamptz,
  add column if not exists claim_owner_hash text;

-- 4. Existing rows are all paid purchases: mark them claimed with no owner.
--    Old success links stop issuing new passes; current passes and
--    Restore by email keep working.
update public.purchases
   set claimed_at = coalesce(claimed_at, now())
 where claimed_at is null;

-- 5. Atomic one-time claim with a same-browser retry window.
create or replace function public.claim_purchase(
  p_session_id text,
  p_owner_hash text,
  p_window_minutes integer default 30
) returns boolean
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    update public.purchases
       set claimed_at = coalesce(claimed_at, now()),
           claim_owner_hash = coalesce(claim_owner_hash, p_owner_hash)
     where stripe_checkout_session_id = p_session_id
       and length(p_owner_hash) = 64
       and (
         claimed_at is null
         or (claim_owner_hash = p_owner_hash
             and claimed_at > now() - make_interval(mins => p_window_minutes))
       )
    returning 1
  )
  select exists (select 1 from claimed);
$$;

-- 6. Server role only.
revoke all on function public.claim_purchase(text, text, integer) from public, anon, authenticated;
grant execute on function public.claim_purchase(text, text, integer) to service_role;

commit;

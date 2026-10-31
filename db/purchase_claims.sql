-- One-time claiming of Stripe payment references. Run manually in the
-- Supabase SQL Editor BEFORE publishing the matching app version.
--
-- Adds two columns to public.purchases and one function. Does not delete or
-- alter any existing purchase data other than marking existing rows claimed.
--
-- Existing purchases are marked claimed with no owner, so their old success
-- links stop granting new passes. Their buyers keep every valid pass they
-- already hold, and can always restore on any device by email
-- (Restore checks purchases by verified email, not by claim state).

alter table public.purchases
  add column if not exists claimed_at timestamptz,
  add column if not exists claim_owner_hash text;

update public.purchases
   set claimed_at = coalesce(claimed_at, now())
 where claimed_at is null;

-- Atomic claim. A single UPDATE takes the row lock, so two simultaneous
-- requests cannot both succeed: the second re-evaluates the WHERE clause
-- against the first one's committed values and matches nothing.
--   * unclaimed row            -> claimed by this owner, returns true
--   * same owner, within window -> returns true (retry), claimed_at unchanged
--   * anything else            -> returns false
create or replace function public.claim_purchase(
  p_session_id text,
  p_owner_hash text,
  p_window_minutes integer default 30
) returns boolean
language sql
security definer
set search_path = public
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

revoke all on function public.claim_purchase(text, text, integer) from public, anon, authenticated;
grant execute on function public.claim_purchase(text, text, integer) to service_role;

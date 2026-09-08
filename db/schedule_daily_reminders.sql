-- Daily reminder schedule. Run manually in the Supabase SQL Editor AFTER
-- db/push_subscriptions.sql. Creates no tables and changes no existing data.
--
-- Replace <REMINDER_CRON_SECRET> with the value stored in the project's
-- secrets (the same value the app reads server-side).
--
-- Goal: exactly one reminder per day at 18:00 UK local time, all year round.
--
-- pg_cron reads cron expressions in UTC, and 18:00 UK is 17:00 UTC during
-- British Summer Time but 18:00 UTC during GMT. So this single job wakes at
-- both 17:00 and 18:00 UTC and sends only on the wake-up that is genuinely
-- 18:00 in London. Postgres' Europe/London timezone data decides which one
-- that is, so the clock change is handled automatically.
--
--   Summer (BST): 17:00 UTC = 18:00 London -> send. 18:00 UTC -> skipped.
--   Winter (GMT): 17:00 UTC = 17:00 London -> skipped. 18:00 UTC -> send.
--
-- pg_cron does NOT replace an existing job when cron.schedule() is called with
-- the same job name, so the script first unschedules any existing
-- verbwise-daily-reminders job and then creates it fresh. This avoids
-- duplicate schedules and double sends.

begin;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any pre-existing schedule with this name (safe even if absent).
select cron.unschedule('verbwise-daily-reminders');

select cron.schedule(
  'verbwise-daily-reminders',
  '0 17,18 * * *',
  $$
  select net.http_post(
    url     := 'https://verb-wise.richard-wells.com/api/public/send-daily-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminder-secret', '<REMINDER_CRON_SECRET>'
    ),
    body    := '{}'::jsonb
  )
  where extract(hour from (now() at time zone 'Europe/London')) = 18;
  $$
);

commit;

-- Check the schedule:
-- select jobname, schedule, active from cron.job where jobname = 'verbwise-daily-reminders';

-- Recent runs (two rows a day expected; only one performs a send):
-- select start_time, status, return_message from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'verbwise-daily-reminders')
--   order by start_time desc limit 20;

-- To remove the schedule later:
-- select cron.unschedule('verbwise-daily-reminders');

-- Daily reminder schedule. Run manually in the Supabase SQL Editor AFTER
-- db/push_subscriptions.sql. Creates no tables and changes no existing data.
--
-- Replace <REMINDER_CRON_SECRET> with the value stored in the project's
-- secrets (the same value the app reads server-side).
--
-- 17:00 UTC = 18:00 UK in winter (GMT), 18:00 BST in summer would be 17:00 UTC
-- only during GMT. Two schedules keep it at ~18:00 UK all year: the job runs
-- at 17:00 UTC and the endpoint itself is idempotent per day, so scheduling
-- both 16:00 and 17:00 UTC would double-send — pick one. 17:00 UTC is used
-- here (18:00 GMT in winter, 18:00 BST is 17:00 UTC, so this is correct in
-- summer and 17:00 local in winter).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'verbwise-daily-reminders',
  '0 17 * * *',
  $$
  select net.http_post(
    url     := 'https://verb-wise.richard-wells.com/api/public/send-daily-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminder-secret', '<REMINDER_CRON_SECRET>'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- To remove the schedule later:
-- select cron.unschedule('verbwise-daily-reminders');

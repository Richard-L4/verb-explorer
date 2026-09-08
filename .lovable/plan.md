# Daily reminders at 18:00 UK all year

## The problem

The current file schedules one fixed UTC time (`0 17 * * *`). That is 18:00 UK only in summer (BST); in winter (GMT) it fires at 17:00 UK. The comment block in the file is also self-contradictory.

## Proposed approach

pg_cron evaluates cron expressions in UTC by default, so no single fixed UTC time can track UK daylight saving. Rather than relying on a database-wide timezone setting (which affects every other job) or two separate jobs (which risks double-sending), keep **one** job named `verbwise-daily-reminders` that wakes at **both** candidate hours — 17:00 and 18:00 UTC — and lets Postgres decide which one is actually 18:00 in London:

```text
cron: 0 17,18 * * *
body: send only if hour(now() at time zone 'Europe/London') = 18
```

- Summer (BST): 17:00 UTC = 18:00 London -> sends. 18:00 UTC = 19:00 London -> skipped.
- Winter (GMT): 17:00 UTC = 17:00 London -> skipped. 18:00 UTC = 18:00 London -> sends.

Exactly one send per day, every day, at 18:00 UK. The `Europe/London` timezone database inside Postgres handles the switchover dates automatically, including any future rule changes.

## Scope

- Only `db/schedule_daily_reminders.sql` is rewritten (comments and schedule).
- No change to `db/push_subscriptions.sql`, no change to the reminder endpoint or any application code.
- No SQL is executed; the file stays a manual run for you in the Supabase SQL Editor.
- Job name stays `verbwise-daily-reminders`. Re-running `cron.schedule` with the same name replaces the existing schedule rather than adding a second one, so no duplicate job is created.
- `<REMINDER_CRON_SECRET>` remains the one placeholder you replace by hand.

## Corrected file contents

```sql
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
-- Re-running this statement with the same job name replaces the existing
-- schedule, so it cannot create a duplicate job or a double send.

create extension if not exists pg_cron;
create extension if not exists pg_net;

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

-- Check the schedule:
-- select jobname, schedule, active from cron.job where jobname = 'verbwise-daily-reminders';

-- Recent runs (two rows a day expected; only one performs a send):
-- select start_time, status, return_message from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'verbwise-daily-reminders')
--   order by start_time desc limit 20;

-- To remove the schedule later:
-- select cron.unschedule('verbwise-daily-reminders');
```

## Note

`cron.job_run_details` will show two entries per day. The 'skipped' one performs no HTTP request — the `where` clause returns no rows — so only one notification goes out.

# Production daily-reminder setup guide

## Where the files live

- `db/push_subscriptions.sql` — creates the `public.push_subscriptions` table.
- `db/schedule_daily_reminders.sql` — creates the `verbwise-daily-reminders` pg_cron job.
- Both files are in the project root under the `db/` folder.

## Where REMINDER_CRON_SECRET is stored

- Project settings → Secrets. It is already configured.
- I will not display the value. You copy it when pasting the schedule SQL.

## Step-by-step

### 1. Open Supabase SQL Editor

1. Go to your Supabase dashboard for this project.
2. Open the SQL Editor (left sidebar → SQL Editor).
3. Click **New query**.

### 2. Run `db/push_subscriptions.sql`

1. In the project files, open `db/push_subscriptions.sql`.
2. Copy the entire file contents.
3. Paste into the Supabase SQL Editor query pane.
4. Click **Run**.
5. This creates one table only: `public.push_subscriptions`. It does not touch any existing table.

### 3. Verify the table was created

In a new SQL Editor query, run:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'push_subscriptions';
```

Expected columns: `id`, `endpoint`, `p256dh`, `auth`, `active`, `created_at`, `last_seen_at`.

### 4. Prepare `db/schedule_daily_reminders.sql`

1. Open `db/schedule_daily_reminders.sql`.
2. Copy the entire file contents.
3. Paste into a new SQL Editor query.

### 5. Replace the placeholder with REMINDER_CRON_SECRET

1. In the SQL pane, find this line:

```sql
'x-reminder-secret', '<REMINDER_CRON_SECRET>'
```

2. Replace `<REMINDER_CRON_SECRET>` (including the angle brackets) with the actual secret value from Project settings → Secrets.
3. Do not change any other text.

### 6. Run the schedule SQL

1. Click **Run**.
2. This wraps the unschedule + schedule in a transaction, so the old schedule is removed and the new one is created atomically.

### 7. Verify the cron job was created

In a new SQL Editor query, run:

```sql
select jobname, schedule, active
from cron.job
where jobname = 'verbwise-daily-reminders';
```

Expected result:

- `jobname`: `verbwise-daily-reminders`
- `schedule`: `0 17,18 * * *`
- `active`: `true`

### 8. Verify the London-time guard works

Run this in the SQL Editor to confirm Postgres resolves UK local time correctly:

```sql
select
  now() at time zone 'UTC' as utc_now,
  now() at time zone 'Europe/London' as london_now,
  extract(hour from (now() at time zone 'Europe/London')) as london_hour;
```

When `london_hour` equals `18`, the next wake-up will actually send reminders.

## What else is required before publishing

Nothing extra is required for the reminder feature itself. The relevant files are:

- `public/push-sw.js`
- `src/lib/push-client.ts`
- `src/lib/push.functions.ts`
- `src/lib/push.server.ts`
- `src/routes/api/public/send-daily-reminders.ts`

These are already in the project. After you run the two SQL files, you can publish the app as normal.

## Important notes

- Run `db/push_subscriptions.sql` **before** `db/schedule_daily_reminders.sql`.
- Do not reveal the secret in chat or screenshots.
- The schedule sends at 18:00 UK time. During winter (GMT) that is 18:00 UTC; during summer (BST) it is 17:00 UTC. Exactly one send happens per day.
- If you ever need to remove the schedule, run:

```sql
select cron.unschedule('verbwise-daily-reminders');
```

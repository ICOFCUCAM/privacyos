-- PrivacyOS scheduled monitoring (pg_cron + pg_net).
--
-- Schedules the always-on protection cycle. pg_cron fires on an interval and
-- pg_net makes an HTTP POST to the app's CRON_SECRET-guarded /api/cron endpoint
-- (or, if you prefer, to the `scheduled-protect` Edge Function URL).
--
-- The endpoint URL and secret are environment-specific, so they are read from
-- database settings. Set them once per project (service-role / SQL editor):
--
--   alter database postgres set app.cron_url    = 'https://your-app.com/api/cron';
--   alter database postgres set app.cron_secret = 'your-CRON_SECRET';
--
-- For production, prefer Supabase Vault over database settings for the secret.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any previous schedule with this name so the migration is re-runnable.
do $$
begin
  perform cron.unschedule('privacyos-scheduled-protect');
exception when others then
  null; -- not yet scheduled
end$$;

-- Run the protection cycle daily.
select cron.schedule(
  'privacyos-scheduled-protect',
  '0 6 * * *',
  $$
    select net.http_post(
      url     := current_setting('app.cron_url', true),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(current_setting('app.cron_secret', true), '')
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- To inspect or change the schedule later:
--   select * from cron.job;
--   select cron.unschedule('privacyos-scheduled-protect');

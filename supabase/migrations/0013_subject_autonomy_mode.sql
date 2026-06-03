-- Persist each subject's autonomy mode (advisor / hybrid / autopilot) so the
-- background protection cycle (/api/cron → runScheduledCycle) can honor the
-- customer's consent contract. The interactive UI also keeps a cookie for an
-- instant response; this column is the source of truth for the scheduler.
--
-- Safe + idempotent: additive column with a default, so existing rows and the
-- current code (which tolerates the column's absence) keep working.

alter table subjects
  add column if not exists autonomy_mode text not null default 'autopilot';

alter table subjects
  drop constraint if exists subjects_autonomy_mode_check;
alter table subjects
  add constraint subjects_autonomy_mode_check
  check (autonomy_mode in ('autopilot', 'hybrid', 'advisor'));

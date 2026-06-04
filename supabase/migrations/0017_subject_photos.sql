-- Store photo/avatar URLs for each subject. The reverse-image / impersonation
-- connector (SerpApi Google Lens) reverse-image-searches these to detect
-- unauthorized use of the subject's likeness and impersonation accounts.
--
-- Safe + idempotent: additive array column with a default, so existing rows and
-- the current code (which tolerates the column's absence) keep working.

alter table subjects
  add column if not exists photos text[] not null default '{}';

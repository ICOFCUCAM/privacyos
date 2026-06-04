-- Credit-monitoring preferences on the subject.
--
-- Credit checks default to MANUAL: a credit pull costs money, so the engine
-- never pulls on the customer's behalf until they opt in. `credit_auto` records
-- that opt-in; `credit_checked_at` is the last pull, which the scheduler uses
-- with the plan's cadence to throttle automated pulls (cost control).

alter table subjects add column if not exists credit_auto boolean not null default false;
alter table subjects add column if not exists credit_checked_at timestamptz;

begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'first@example.test'),
  ('00000000-0000-4000-8000-000000000002', 'second@example.test');

insert into public.commitments (owner_id, title, starts_on, start_time, end_time, repeats_weekly)
values ('00000000-0000-4000-8000-000000000001', 'Study group', current_date, '09:00', '10:00', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

insert into public.tasks (title, notes, category, due_date, due_time)
values ('Write outline', 'First draft', 'Writing', current_date + 2, '17:00');
update public.tasks
set title = 'Review outline', due_date = current_date + 3, status = 'completed'
where title = 'Write outline';

insert into public.task_series (title, category, frequency, starts_on, due_time)
values ('Review notes', 'Study', 'weekly', (now() at time zone 'UTC')::date, '10:00');

do $$
declare
  first_day date := (now() at time zone 'UTC')::date;
begin
  if not exists (
    select from public.tasks where title = 'Review outline' and status = 'completed'
      and due_date = current_date + 3 and due_time = '17:00'
      and category = 'Writing' and notes = 'First draft'
  ) then raise exception 'Task create/edit/complete failed'; end if;

  if (select count(*) from public.commitments) <> 1 then
    raise exception 'Owner must see the fixed commitment';
  end if;
  if (select count(*) from public.change_history) <> 4
    or not exists (select from public.change_history where title = 'Review outline' and action = 'completed')
    or not exists (select from public.change_history where title = 'Study group' and kind = 'commitment')
    or not exists (select from public.change_history where title = 'Review notes' and kind = 'series' and action = 'added') then
    raise exception 'History must capture edits without logging generated instances or watermark updates';
  end if;

  begin
    update public.change_history set title = 'Forged update';
    raise exception 'Browser roles must not write change history';
  exception when insufficient_privilege then null;
  end;

  update public.tasks set status = 'completed', due_date = first_day + 1
  where title = 'Review notes' and recurrence_date = first_day;
  if not exists (
    select from public.tasks where title = 'Review notes' and status = 'open'
      and recurrence_date = first_day + 7 and due_date = first_day + 7
      and category = 'Study' and due_time = '10:00'
  ) then raise exception 'Completing or rescheduling an instance changed the next one'; end if;

  begin
    perform public.materialize_recurring_tasks();
    raise exception 'Browser roles must not generate tasks across accounts';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.task_series set generated_through = current_date where title = 'Review notes';
    raise exception 'Browser roles must not set the generation watermark';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.tasks set recurrence_date = first_day + 2 where title = 'Review notes';
    raise exception 'A browser edit must not overwrite instance identity';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
do $$
begin
  if exists (select from public.commitments) or exists (select from public.tasks)
    or exists (select from public.task_series) or exists (select from public.change_history) then
    raise exception 'Accounts must be isolated';
  end if;
  update public.tasks set status = 'cancelled';
  if found then raise exception 'Another account must not update tasks'; end if;
  insert into public.tasks (title) values ('Second account’s task');
end;
$$;

reset role;
set local role anon;
do $$
begin
  begin
    perform * from public.tasks;
    raise exception 'Anonymous access must be denied';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
do $$
declare
  utc_today date := (now() at time zone 'UTC')::date;
  job record;
begin
  select * into strict job from cron.job where jobname = 'dashboard-recurring-tasks';
  if job.schedule <> '5 0 * * *' then raise exception 'Daily schedule missing'; end if;

  insert into public.task_series (owner_id, title, frequency, starts_on)
  values ('00000000-0000-4000-8000-000000000001', 'Horizon check', 'daily', utc_today + 91);
  if exists (select from public.tasks where title = 'Horizon check') then
    raise exception 'Generated beyond the initial window';
  end if;
  -- A year with a leap day tests clamping and recovery of the original anchor.
  if array(
    select * from dashboard_private.recurring_dates('2024-01-31', 'monthly', 1, '2024-02-01', '2024-04-30')
  ) <> array[date '2024-02-29', date '2024-03-31', date '2024-04-30'] then
    raise exception 'Month-end anchors drifted';
  end if;
  if array(
    select * from dashboard_private.recurring_dates('2024-02-29', 'yearly', 2, '2025-01-01', '2029-01-01')
  ) <> array[date '2026-02-28', date '2028-02-29'] then
    raise exception 'Leap-day anchors drifted';
  end if;

  update public.task_series set active = false where title = 'Horizon check';
  if public.materialize_recurring_tasks(utc_today + 97) <> 1 then
    raise exception 'A paused series generated tasks or the weekly series did not advance';
  end if;
  update public.task_series set active = true where title = 'Horizon check';
  if public.materialize_recurring_tasks(utc_today + 97) <> 7 then
    raise exception 'Recurrence did not extend the horizon';
  end if;
  if public.materialize_recurring_tasks(utc_today + 97) <> 0 then
    raise exception 'Materialization must be idempotent';
  end if;

  -- Simulate a stack in which the last run only covered through tomorrow.
  insert into public.task_series (owner_id, title, frequency, starts_on, active)
  values ('00000000-0000-4000-8000-000000000001', 'Cron fill', 'daily', utc_today + 78, false);
  -- Rewind to a shorter window as if the previous run used an earlier date.
  update public.task_series set active = true where title = 'Cron fill';
  delete from public.tasks where title = 'Cron fill' and recurrence_date > utc_today + 80;
  update public.task_series set generated_through = utc_today + 80 where title = 'Cron fill';
  execute job.command;
  if (select count(*) from public.tasks where title = 'Cron fill') <> 13 then
    raise exception 'The scheduled command did not replenish the horizon';
  end if;

  delete from public.commitments where title = 'Study group';
  if not exists (select from public.change_history where title = 'Study group' and action = 'deleted') then
    raise exception 'Deleting a commitment must leave a readable update';
  end if;

  delete from auth.users where email = 'first@example.test';
  if exists (select from public.change_history where owner_id = '00000000-0000-4000-8000-000000000001') then
    raise exception 'Deleting an account must remove its history';
  end if;
end;
$$;

rollback;

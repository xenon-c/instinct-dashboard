begin;

create extension if not exists pg_cron with schema pg_catalog;
create schema dashboard_private;
revoke all on schema dashboard_private from public, anon, authenticated;

create type public.task_status as enum ('open', 'completed', 'cancelled');
create type public.repeat_frequency as enum ('daily', 'weekly', 'monthly', 'yearly');
create type public.history_kind as enum ('task', 'commitment', 'series');
create type public.history_action as enum (
  'added', 'edited', 'completed', 'cancelled', 'reopened', 'rescheduled', 'paused', 'resumed', 'deleted'
);

create table public.task_series (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 2000),
  notes text not null default '',
  category text not null default '',
  starts_on date not null check (isfinite(starts_on)),
  ends_on date check (isfinite(ends_on) and ends_on >= starts_on),
  due_time time check (due_time < time '24:00'),
  frequency public.repeat_frequency not null,
  repeat_every smallint not null default 1 check (repeat_every between 1 and 366),
  active boolean not null default true,
  generated_through date check (isfinite(generated_through) and generated_through >= starts_on),
  unique (id, owner_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 2000),
  notes text not null default '',
  category text not null default '',
  status public.task_status not null default 'open',
  due_date date check (isfinite(due_date)),
  due_time time check (due_time is null or (due_date is not null and due_time < time '24:00')),
  series_id uuid,
  recurrence_date date check (isfinite(recurrence_date)),
  foreign key (series_id, owner_id) references public.task_series(id, owner_id),
  unique (series_id, recurrence_date),
  check ((series_id is null) = (recurrence_date is null))
);

create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 2000),
  notes text not null default '',
  starts_on date not null check (isfinite(starts_on)),
  ends_on date check (isfinite(ends_on) and ends_on >= starts_on),
  start_time time check (start_time < time '24:00'),
  end_time time check (end_time is null or (start_time is not null and end_time < time '24:00' and end_time <> start_time)),
  repeats_weekly boolean not null default false
);

create table public.change_history (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  record_id uuid not null,
  kind public.history_kind not null,
  action public.history_action not null,
  title text not null,
  changed_at timestamptz not null default clock_timestamp()
);

create index tasks_owner_due_idx on public.tasks (owner_id, due_date, due_time);
create index commitments_owner_start_idx on public.commitments (owner_id, starts_on);
create index task_series_owner_idx on public.task_series (owner_id);
create index task_series_active_idx on public.task_series (starts_on) where active;
create index change_history_recent_idx on public.change_history (owner_id, changed_at desc, id desc);

alter table public.tasks enable row level security;
alter table public.commitments enable row level security;
alter table public.task_series enable row level security;
alter table public.change_history enable row level security;

revoke all on public.tasks, public.commitments, public.task_series from public, anon, authenticated;
grant select on public.tasks, public.commitments, public.task_series to authenticated;
revoke all on public.change_history from public, anon, authenticated, service_role;
grant select on public.change_history to authenticated, service_role;
grant insert (title, notes, category, status, due_date, due_time),
      update (title, notes, category, status, due_date, due_time)
  on public.tasks to authenticated;
grant insert (title, notes, category, starts_on, ends_on, due_time, frequency, repeat_every),
      update (active)
  on public.task_series to authenticated;

create policy tasks_read on public.tasks for select to authenticated
  using (owner_id = (select auth.uid()));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy tasks_update on public.tasks for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy commitments_read on public.commitments for select to authenticated
  using (owner_id = (select auth.uid()));
create policy series_read on public.task_series for select to authenticated
  using (owner_id = (select auth.uid()));
create policy series_insert on public.task_series for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy series_update on public.task_series for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy history_read on public.change_history for select to authenticated
  using (owner_id = (select auth.uid()));

create function dashboard_private.capture_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  record_now jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  owner uuid := (record_now->>'owner_id')::uuid;
  kind public.history_kind;
  action public.history_action;
begin
  if tg_op = 'UPDATE' and (to_jsonb(old) - 'generated_through') = (record_now - 'generated_through') then
    return null;
  end if;

  case tg_table_name
    when 'tasks' then
      kind := 'task';
      if tg_op = 'INSERT' and new.series_id is not null then return null; end if;
      if tg_op = 'UPDATE' then
        if old.status <> new.status then
          action := (case new.status when 'open' then 'reopened' else new.status::text end)::public.history_action;
        elsif (old.due_date, old.due_time) is distinct from (new.due_date, new.due_time) then
          action := 'rescheduled';
        end if;
      end if;
    when 'commitments' then
      kind := 'commitment';
    when 'task_series' then
      kind := 'series';
      if tg_op = 'UPDATE' and old.active <> new.active then
        action := case when new.active then 'resumed'::public.history_action else 'paused'::public.history_action end;
      end if;
  end case;

  if tg_op = 'DELETE' and not exists (select from auth.users where id = owner) then
    return null;
  end if;

  action := coalesce(action, case tg_op
    when 'INSERT' then 'added'::public.history_action
    when 'DELETE' then 'deleted'::public.history_action
    else 'edited'::public.history_action end);
  insert into public.change_history (owner_id, record_id, kind, action, title)
  values (owner, (record_now->>'id')::uuid, kind, action, record_now->>'title');
  return null;
end;
$$;

create trigger capture_task_change after insert or update or delete on public.tasks
  for each row execute function dashboard_private.capture_change();
create trigger capture_commitment_change after insert or update or delete on public.commitments
  for each row execute function dashboard_private.capture_change();
create trigger capture_series_change after insert or update or delete on public.task_series
  for each row execute function dashboard_private.capture_change();

-- Start close to the requested window even when the original anchor is old.
-- Compute monthly and yearly dates from the original day to avoid month-end drift.
create function dashboard_private.recurring_dates(
  anchor date, frequency public.repeat_frequency, repeat_every integer,
  from_date date, to_date date
) returns setof date language plpgsql immutable set search_path = '' as $$
declare
  step_days integer;
  step_months integer;
  first_number integer;
  last_number integer;
  occurrence date;
begin
  if frequency in ('daily', 'weekly') then
    step_days := repeat_every * case when frequency = 'weekly' then 7 else 1 end;
    first_number := greatest(0, (from_date - anchor + step_days - 1) / step_days);
    last_number := (to_date - anchor) / step_days;
    for n in first_number..last_number loop
      return next anchor + n * step_days;
    end loop;
  else
    step_months := repeat_every * case when frequency = 'yearly' then 12 else 1 end;
    first_number := greatest(0, (
      (extract(year from from_date) - extract(year from anchor)) * 12
        + extract(month from from_date) - extract(month from anchor)
    )::integer / step_months);
    last_number := (
      (extract(year from to_date) - extract(year from anchor)) * 12
        + extract(month from to_date) - extract(month from anchor)
    )::integer / step_months;
    for n in first_number..last_number loop
      occurrence := (anchor + pg_catalog.make_interval(months => n * step_months))::date;
      if occurrence between from_date and to_date then
        return next occurrence;
      end if;
    end loop;
  end if;
end;
$$;

create function dashboard_private.generate_task_instances(through_date date, only_series uuid)
returns integer language plpgsql set search_path = '' as $$
declare
  series public.task_series;
  from_date date;
  to_date date;
  inserted integer;
  total integer := 0;
begin
  for series in
    select * from public.task_series
    where active and (only_series is null or id = only_series)
      and starts_on <= through_date
      and (generated_through is null or generated_through < least(through_date, ends_on))
    order by id for no key update
  loop
    from_date := coalesce(series.generated_through + 1, series.starts_on);
    to_date := least(through_date, series.ends_on, from_date + 399);
    insert into public.tasks (owner_id, title, notes, category, due_date, due_time, series_id, recurrence_date)
      select series.owner_id, series.title, series.notes, series.category, day, series.due_time, series.id, day
      from dashboard_private.recurring_dates(
        series.starts_on, series.frequency, series.repeat_every, from_date, to_date
      ) as days(day)
      on conflict (series_id, recurrence_date) do nothing;
    get diagnostics inserted = row_count;
    total := total + inserted;
    update public.task_series set generated_through = to_date where id = series.id;
  end loop;
  return total;
end;
$$;

create function public.materialize_recurring_tasks(
  through_date date default ((now() at time zone 'UTC')::date + 90)
) returns integer language plpgsql security definer set search_path = '' as $$
begin
  if through_date is null or not isfinite(through_date)
      or through_date > (now() at time zone 'UTC')::date + 400 then
    raise exception 'Generation horizon cannot exceed 400 days from today' using errcode = '22023';
  end if;
  return dashboard_private.generate_task_instances(through_date, null);
end;
$$;

create function dashboard_private.initialize_task_series()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform dashboard_private.generate_task_instances((now() at time zone 'UTC')::date + 90, new.id);
  return null;
end;
$$;

create trigger initialize_task_series
  after insert or update of active on public.task_series
  for each row when (new.active) execute function dashboard_private.initialize_task_series();

revoke execute on all functions in schema dashboard_private from public, anon, authenticated, service_role;
revoke execute on function public.materialize_recurring_tasks(date) from public, anon, authenticated;

select cron.schedule(
  'dashboard-recurring-tasks',
  '5 0 * * *',
  'select public.materialize_recurring_tasks();'
);

commit;

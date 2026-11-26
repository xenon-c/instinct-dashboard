-- TEST HARNESS ONLY, for an empty disposable vanilla PostgreSQL cluster.
-- Never apply to a Supabase project. These are minimal stand-ins, not GoTrue.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Captures the migration's call to pg_cron in the standalone test cluster.
create schema cron;
create table cron.job (jobname text primary key, schedule text, command text);
create function cron.schedule(job_name text, job_schedule text, job_command text)
returns bigint language sql as $$
  insert into cron.job values (job_name, job_schedule, job_command);
  select 1::bigint;
$$;

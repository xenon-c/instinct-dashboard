# Instinct Dashboard

A private dashboard for personal tasks, fixed commitments, and recurring tasks. From `/` you can add, edit, complete, or reopen a task. The agenda shows tasks and commitments for the next 14 days, with an option to look further ahead. Search the agenda by title, notes, or category, and see the next deadline count down. Recent updates shows the latest 60 changes to tasks, commitments, and recurring schedules, including changes made directly in Supabase. Recurring schedules create ordinary task instances that you can update or complete independently.

## Run locally

With Node.js 22 or later, run these commands from the project folder:

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The dashboard opens with read-only sample data. To save your own tasks, [connect Supabase](#connect-supabase-for-your-own-data-optional) and sign in.

## Connect Supabase for your own data (optional)

The app can run on your computer and use a hosted Supabase project for sign-in and saving your tasks. For a database on your computer too, see [Run Supabase locally](#run-supabase-locally-optional).

1. [Create a new Supabase project](https://supabase.com/dashboard/new).
2. In its **SQL Editor**, create a new query, paste the entire [dashboard migration](supabase/migrations/20261126000000_dashboard.sql), and run it once. It creates the task, commitment, recurring schedule, and change history tables, and installs the daily recurring-task job through [Supabase Cron](https://supabase.com/docs/guides/cron).
3. In **Authentication → Users**, create a user with an email and password and mark the email as confirmed. Disable **Allow new users to sign up** in the project's Auth settings. The dashboard reads and writes rows belonging to the signed-in user.
4. Copy [.env.example](.env.example) to `.env.local`. From the project's **Connect** dialog or **Settings → API Keys**, copy the Project URL into `NEXT_PUBLIC_SUPABASE_URL` and the publishable key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The legacy `anon` key also works. Use public credentials for this file.

After setting the variables, restart `npm run dev`, open [localhost:3000](http://localhost:3000), and choose **Sign in**. Use the email and password you created in Supabase.

### Let Instinct update the dashboard (optional)

in **Settings → API Keys**, create a secret API key (not the publishable key). Give it to Instinct only through the secure vault link Instinct sends you when you ask it to connect the dashboard. Never paste the key into a chat or commit it to the repo. Also give Instinct your `owner_id` (the user's UUID from **Authentication → Users**) in chat, since it is not secret, so its writes land under your account. Revoke the key in Supabase at any time to cut off access.

### Add fixed commitments

In the Supabase **Table Editor**, open `commitments` and insert a row with the following values.

- `owner_id` is the user's UUID from **Authentication → Users**.
- `title` is the meeting or class name, and `starts_on` is its first date.
- `start_time` and `end_time` are local times. Leave both blank for an all-day commitment. An end time earlier than the start time means the commitment ends after midnight.
- Set `repeats_weekly` for a weekly commitment on the same day as `starts_on`. The optional `ends_on` is the last allowed date in the series. For a one-off commitment, it is the last day of a multi-day event.
- `notes` is optional.

Task due dates and commitment times use the browser's local calendar and clock. Creating or resuming a recurring task generates upcoming dates immediately if they fall inside the rolling 90-day window. The `dashboard-recurring-tasks` job replenishes that window daily. Pausing a schedule stops future generation. Its existing tasks stay in the dashboard.

### Run Supabase locally (optional)

Start Docker and run `npx supabase start` from the project folder. The local stack applies the same migration and starts with empty tables. Create a user with a confirmed email in the local Supabase Studio, then put the local URL and publishable or anon key printed by the CLI in `.env.local`. Restart `npm run dev` and sign in at [localhost:3000](http://localhost:3000).

Run `npm run db:types` with the local stack running to regenerate the checked-in database types.

## Verify locally

With Supabase connected, create a weekly task starting today and complete its first instance. The next instance should stay open.

```sh
npm run lint
npm run typecheck
npm test
npm run build
python3 scripts/verify_database.py
```

The database verifier uses an empty, temporary PostgreSQL cluster with stand-ins for Supabase Auth and Cron. It needs `initdb`, `pg_ctl`, and `psql` on your PATH.

## Deploy to Cloudflare Workers (optional)

Follow these steps if you want to host the dashboard at a public URL.

1. Sign in using `npx wrangler login`. In [wrangler.jsonc](wrangler.jsonc), set `name` and the `WORKER_SELF_REFERENCE` service to the same Worker name.
2. To connect the deployed dashboard to Supabase, set the same two public Supabase variables in the build environment. For a deploy from your machine, Next.js reads `.env.local`. Next.js embeds both variables in the browser bundle during the build, so rebuild after changing them.
3. Run `npm run preview` to build and preview in the Workers runtime, then `npm run deploy` to publish. The app needs no additional Worker environment variables.

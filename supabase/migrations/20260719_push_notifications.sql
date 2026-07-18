-- ================================================================
-- Real Web Push support
-- Run this in: Supabase → SQL Editor → New query → Run
-- (after deploying the `send-due-notifications` Edge Function)
-- ================================================================

-- One row per browser/device the user has granted notification permission on.
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  created_at   timestamptz not null default now()
);

-- One row per notification the app wants delivered at a specific time.
-- The client (habits/medicine/tasks/events reminders) upserts rows here
-- instead of relying only on local Service Worker timers, so delivery
-- survives the app/browser being fully closed.
create table if not exists public.scheduled_notifications (
  id           text primary key,   -- client-generated, e.g. 'habit-<uuid>'
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  body         text default '',
  fire_at      timestamptz not null,
  fired        boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists scheduled_notifications_due_idx
  on public.scheduled_notifications (fire_at)
  where fired = false;

alter table public.push_subscriptions enable row level security;
alter table public.scheduled_notifications enable row level security;

drop policy if exists "owner" on public.push_subscriptions;
create policy "owner" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner" on public.scheduled_notifications;
create policy "owner" on public.scheduled_notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- Cron: call the send-due-notifications Edge Function every minute.
-- Requires the pg_cron and pg_net extensions (enabled by default on
-- Supabase). Replace YOUR-PROJECT and the secret below before running.
-- ────────────────────────────────────────────────────────────────
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-due-notifications-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-PROJECT.supabase.co/functions/v1/send-due-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'REPLACE-WITH-THE-SAME-VALUE-YOU-SET-AS-THE-CRON_SECRET-FUNCTION-SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);

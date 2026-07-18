-- ================================================================
-- Life OS — Complete Supabase Schema
-- Run this ONCE in: Supabase → SQL Editor → New query → Run
-- ================================================================

create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────────
-- PROFILES
-- ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  name          text    not null default 'Friend',
  username      text    default '',
  bio           text    default '',
  birthday      text    default '',
  gender        text    default '',
  height        numeric(5,1),
  weight        numeric(5,1),
  goal_weight   numeric(5,1),
  timezone      text    default 'Asia/Kolkata',
  language      text    default 'English',
  avatar_emoji  text    default '🦊',
  theme         text    default 'dark',
  accent        text    default '252 95% 68%',
  accent_name   text    default 'Violet',
  pin           text    default '',
  updated_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- HABITS
-- ────────────────────────────────────────────────────────────────
create table if not exists public.habits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  emoji        text default '⭐',
  color        text default '#8b5cf6',
  category     text default 'General',
  frequency    text not null default 'daily',
  custom_days  int[] default '{}',
  notes        text default '',
  reminder     text default '',
  archived     boolean not null default false,
  completions  text[] default '{}',   -- array of ISO date strings
  created_at   timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- TASKS
-- ────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  description  text default '',
  priority     text not null default 'medium',
  due_date     text default '',
  due_time     text default '',
  category     text default 'Personal',
  tags         text[] default '{}',
  subtasks     jsonb default '[]',
  done         boolean not null default false,
  recurring    text not null default 'none',
  completed_at text,
  created_at   timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- CALENDAR EVENTS
-- ────────────────────────────────────────────────────────────────
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  date       text not null,
  start_time text default '',
  end_time   text default '',
  color      text default '#8b5cf6',
  category   text default 'General',
  repeat     text not null default 'none',
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- HEALTH LOGS (one row per day per user)
-- ────────────────────────────────────────────────────────────────
create table if not exists public.health_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          text not null,
  mood          int  not null default 0,
  energy        int  not null default 0,
  sleep_hours   numeric(4,1) not null default 0,
  sleep_quality int  not null default 0,
  water         int  not null default 0,
  steps         int  not null default 0,
  calories      int  not null default 0,
  weight        numeric(5,1),
  notes         text default '',
  unique (user_id, date)
);

-- ────────────────────────────────────────────────────────────────
-- MEDICINES
-- ────────────────────────────────────────────────────────────────
create table if not exists public.medicines (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  dosage        text default '',
  times         jsonb not null default '{"morning":false,"afternoon":false,"evening":false,"night":false}',
  food_timing   text not null default 'any',
  start_date    text default '',
  end_date      text default '',
  weekdays      int[] default '{0,1,2,3,4,5,6}',
  refill_date   text default '',
  doctor_notes  text default '',
  taken         text[] default '{}',   -- array of "date_slot" strings
  created_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- FINANCE
-- ────────────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in ('income', 'expense')),
  amount     numeric(12,2) not null,
  category   text not null,
  date       text not null,
  note       text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  category   text not null,
  limit_amt  numeric(12,2) not null default 0,
  unique (user_id, category)
);

create table if not exists public.savings_goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  target     numeric(12,2) not null,
  saved      numeric(12,2) not null default 0,
  emoji      text default '🎯',
  created_at timestamptz not null default now()
);

create table if not exists public.emis (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  amount     numeric(12,2) not null,
  due_day    int not null,
  remaining  int not null default 0,
  total      int not null default 0,
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- LEARNING
-- ────────────────────────────────────────────────────────────────
create table if not exists public.learning_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  type       text not null default 'course',
  progress   int  not null default 0,
  notes      text default '',
  resource   text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.study_logs (
  user_id  uuid not null references auth.users(id) on delete cascade,
  date     text not null,
  minutes  int  not null default 0,
  primary key (user_id, date)
);

-- ────────────────────────────────────────────────────────────────
-- GOALS
-- ────────────────────────────────────────────────────────────────
create table if not exists public.goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  horizon    text not null default 'short',
  deadline   text default '',
  milestones jsonb default '[]',
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- VISION BOARD
-- ────────────────────────────────────────────────────────────────
create table if not exists public.vision_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  category    text default 'Lifestyle',
  quote       text default '',
  target_date text default '',
  gradient    text default 'from-violet-500 to-fuchsia-500',
  emoji       text default '🌟',
  created_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- JOURNAL
-- ────────────────────────────────────────────────────────────────
create table if not exists public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       text not null,
  title      text default '',
  body       text not null default '',
  mood       text default '',
  tags       text[] default '{}',
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- REFLECTIONS (daily)
-- ────────────────────────────────────────────────────────────────
create table if not exists public.reflections (
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       text not null,
  wins       text default '',
  challenges text default '',
  gratitude  text default '',
  lessons    text default '',
  mood       int  default 3,
  tomorrow   text default '',
  rating     int  default 3,
  primary key (user_id, date)
);

-- ────────────────────────────────────────────────────────────────
-- FOCUS SESSIONS
-- ────────────────────────────────────────────────────────────────
create table if not exists public.focus_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       text not null,
  minutes    int  not null,
  kind       text not null default 'focus',
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- PLANNER BLOCKS
-- ────────────────────────────────────────────────────────────────
create table if not exists public.planner_blocks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       text not null,
  hour       int  not null,
  title      text not null,
  kind       text not null default 'task',
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- VAULT (password manager)
-- ────────────────────────────────────────────────────────────────
create table if not exists public.vault_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  website    text not null,
  username   text default '',
  password   text not null,   -- stored as plain text; encrypt on client if needed
  notes      text default '',
  category   text default 'General',
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- SHOPPING
-- ────────────────────────────────────────────────────────────────
create table if not exists public.shopping_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  list       text not null default 'grocery',
  category   text default 'General',
  qty        int  not null default 1,
  price      numeric(10,2) not null default 0,
  purchased  boolean not null default false,
  recurring  boolean not null default false,
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- GAMIFICATION
-- ────────────────────────────────────────────────────────────────
create table if not exists public.user_xp (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  xp            int not null default 0,
  coins         int not null default 0,
  streak_freezes int not null default 2,
  badges        jsonb not null default '{}'   -- {badgeId: earnedAtDate}
);

-- ────────────────────────────────────────────────────────────────
-- STATE BACKUP (Real-time Supabase cloud sync)
-- ────────────────────────────────────────────────────────────────
create table if not exists public.user_backups (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  state       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) — each user only sees their own data
-- ────────────────────────────────────────────────────────────────
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' and tablename != 'spatial_ref_sys'
  loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;

-- single reusable policy pattern for all tables
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' and tablename != 'spatial_ref_sys'
  loop
    execute format('drop policy if exists "owner" on public.%I', t);
    execute format('create policy "owner" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────────
-- AUTO-CREATE PROFILE + XP ROW ON SIGN-UP
-- ────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Friend'))
    on conflict (user_id) do nothing;
  insert into public.user_xp (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ────────────────────────────────────────────────────────────────
-- INDEXES for performance
-- ────────────────────────────────────────────────────────────────
create index if not exists idx_habits_user        on public.habits (user_id);
create index if not exists idx_tasks_user         on public.tasks (user_id, due_date);
create index if not exists idx_events_user        on public.events (user_id, date);
create index if not exists idx_health_user_date   on public.health_logs (user_id, date);
create index if not exists idx_transactions_user  on public.transactions (user_id, date desc);
create index if not exists idx_journal_user       on public.journal_entries (user_id, date desc);
create index if not exists idx_focus_user         on public.focus_sessions (user_id, date desc);
create index if not exists idx_planner_user       on public.planner_blocks (user_id, date);

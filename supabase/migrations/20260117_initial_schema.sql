-- ==========================================
-- SCRIPT 1: INITIAL SCHEMA
-- Run this FIRST in Supabase SQL Editor
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABLES
-- ==========================================

-- 1. Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habits
CREATE TABLE public.habits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'personal',
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '💪',
  frequency TEXT DEFAULT 'daily',
  target_count INTEGER DEFAULT 1,
  unit TEXT DEFAULT 'times',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habit Logs
CREATE TABLE public.habit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  value INTEGER DEFAULT 1,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Chores
CREATE TABLE public.chores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  due_date TIMESTAMP WITH TIME ZONE,
  recurrence TEXT DEFAULT 'once',
  category TEXT DEFAULT 'home',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Health Metrics
CREATE TABLE public.health_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  mood INTEGER CHECK (mood >= 1 AND mood <= 10),
  energy INTEGER CHECK (energy >= 1 AND energy <= 10),
  sleep_hours DECIMAL(3,1),
  steps INTEGER,
  calories_burned INTEGER,
  water_intake_ml INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 6. Google Calendar Tokens
CREATE TABLE public.google_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Profiles
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Habits
CREATE POLICY "Users can CRUD own habits" 
  ON habits FOR ALL USING (auth.uid() = user_id);

-- Habit Logs
CREATE POLICY "Users can CRUD own habit logs" 
  ON habit_logs FOR ALL USING (auth.uid() = user_id);

-- Chores
CREATE POLICY "Users can CRUD own chores" 
  ON chores FOR ALL USING (auth.uid() = user_id);

-- Health Metrics
CREATE POLICY "Users can CRUD own health metrics" 
  ON health_metrics FOR ALL USING (auth.uid() = user_id);

-- Google Tokens
CREATE POLICY "Users can CRUD own google tokens" 
  ON google_tokens FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- FUNCTION: Calculate Habit Streak
-- ==========================================

CREATE OR REPLACE FUNCTION get_habit_streak(habit_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak_count INTEGER := 0;
  current_date DATE := CURRENT_DATE;
  check_date DATE;
BEGIN
  FOR check_date IN SELECT generate_series(current_date, current_date - interval '365 days', '-1 day'::interval)::date
  LOOP
    IF EXISTS (
      SELECT 1 FROM habit_logs
      WHERE habit_id = $1
        AND DATE(completed_at) = check_date
    ) THEN
      streak_count := streak_count + 1;
    ELSE
      IF check_date != current_date THEN
        EXIT;
      END IF;
    END IF;
  END LOOP;
  
  RETURN streak_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- AUTO-UPDATE TIMESTAMPS
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habits_updated_at 
  BEFORE UPDATE ON habits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chores_updated_at 
  BEFORE UPDATE ON chores 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_metrics_updated_at 
  BEFORE UPDATE ON health_metrics 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_tokens_updated_at 
  BEFORE UPDATE ON google_tokens 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

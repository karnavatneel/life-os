-- ==========================================
-- SCRIPT 2: ADDITIONAL FEATURES
-- Run THIS SECOND in Supabase SQL Editor
-- ==========================================

-- ==========================================
-- 1. TODOS TABLE
-- ==========================================

CREATE TABLE public.todos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  due_date DATE,
  category TEXT DEFAULT 'personal',
  recurring TEXT DEFAULT 'none',
  subtasks JSONB DEFAULT '[]',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. POMODORO SESSIONS
-- ==========================================

CREATE TABLE public.pomodoro_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  duration INTEGER NOT NULL,
  type TEXT DEFAULT 'focus',
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. JOURNAL ENTRIES
-- ==========================================

CREATE TABLE public.journal_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  mood INTEGER CHECK (mood >= 1 AND mood <= 10),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. ACHIEVEMENTS
-- ==========================================

CREATE TABLE public.achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  achievement_type TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- ==========================================
-- 5. ENABLE RLS
-- ==========================================

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 6. RLS POLICIES
-- ==========================================

CREATE POLICY "Users can CRUD own todos" 
  ON todos FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own pomodoro sessions" 
  ON pomodoro_sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own journal entries" 
  ON journal_entries FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own achievements" 
  ON achievements FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 7. TRIGGERS FOR UPDATED_AT
-- ==========================================

CREATE TRIGGER update_todos_updated_at 
  BEFORE UPDATE ON todos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at 
  BEFORE UPDATE ON journal_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 8. INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_status ON todos(status);
CREATE INDEX idx_todos_due_date ON todos(due_date);

CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(date);

CREATE INDEX idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);

CREATE INDEX idx_achievements_user_id ON achievements(user_id);

-- ==========================================
-- 9. VERIFICATION QUERIES
-- ==========================================

-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check all RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

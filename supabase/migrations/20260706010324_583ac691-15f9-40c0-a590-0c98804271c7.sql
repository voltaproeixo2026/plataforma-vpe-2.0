
-- =========== PROFILES ===========
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  last_cycle_start date,
  cycle_length integer DEFAULT 28,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own_profile_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own_profile_update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own_profile_delete" ON public.profiles FOR DELETE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========== CONTACTS ===========
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  instagram text,
  whatsapp text,
  email text,
  status text NOT NULL DEFAULT 'morno',
  origem text,
  next_action text,
  notes text,
  call_date date,
  call_time text,
  comum text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_contacts" ON public.contacts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== OBJECTIVES ===========
CREATE TABLE public.objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  category text NOT NULL DEFAULT 'outro',
  month_ref text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.objectives TO authenticated;
GRANT ALL ON public.objectives TO service_role;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_objectives" ON public.objectives FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== INTENTIONS ===========
CREATE TABLE public.intentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  month_ref text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intentions TO authenticated;
GRANT ALL ON public.intentions TO service_role;
ALTER TABLE public.intentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_intentions" ON public.intentions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== SS COUNTS ===========
CREATE TABLE public.ss_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  abordagem integer NOT NULL DEFAULT 0,
  resposta integer NOT NULL DEFAULT 0,
  reuniao integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_counts TO authenticated;
GRANT ALL ON public.ss_counts TO service_role;
ALTER TABLE public.ss_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_ss_counts" ON public.ss_counts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== SS CONFIG ===========
CREATE TABLE public.ss_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  meta_day integer NOT NULL DEFAULT 10,
  meta_week_reun integer NOT NULL DEFAULT 3,
  taxa integer NOT NULL DEFAULT 20,
  ticket numeric NOT NULL DEFAULT 2000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_config TO authenticated;
GRANT ALL ON public.ss_config TO service_role;
ALTER TABLE public.ss_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_ss_config" ON public.ss_config FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== FAT ENTRIES ===========
CREATE TABLE public.fat_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL,
  value numeric NOT NULL,
  date date NOT NULL,
  category text NOT NULL DEFAULT 'Outro',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fat_entries TO authenticated;
GRANT ALL ON public.fat_entries TO service_role;
ALTER TABLE public.fat_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_fat_entries" ON public.fat_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== FAT META ===========
CREATE TABLE public.fat_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_ref text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  UNIQUE(user_id, month_ref)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fat_meta TO authenticated;
GRANT ALL ON public.fat_meta TO service_role;
ALTER TABLE public.fat_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_fat_meta" ON public.fat_meta FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== CONTENT CARDS ===========
CREATE TABLE public.content_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  format text NOT NULL DEFAULT 'Post único',
  status text NOT NULL DEFAULT 'Ideias',
  publish_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_cards TO authenticated;
GRANT ALL ON public.content_cards TO service_role;
ALTER TABLE public.content_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_content_cards" ON public.content_cards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== ACTIONS ===========
CREATE TABLE public.actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Outro',
  date date,
  revenue numeric,
  people_reached integer,
  people_closed integer,
  what_worked text,
  what_to_improve text,
  next_opportunities text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actions TO authenticated;
GRANT ALL ON public.actions TO service_role;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_actions" ON public.actions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== CALENDAR EVENTS ===========
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL,
  type text NOT NULL DEFAULT 'tc',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_calendar_events" ON public.calendar_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== TASKS ===========
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  priority text NOT NULL DEFAULT 'media',
  category text NOT NULL DEFAULT 'outro',
  notes text,
  done boolean NOT NULL DEFAULT false,
  date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== FUNNELS ===========
CREATE TABLE public.funnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  steps jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnels TO authenticated;
GRANT ALL ON public.funnels TO service_role;
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_funnels" ON public.funnels FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== TIME LOGS ===========
CREATE TABLE public.time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity text NOT NULL,
  category text NOT NULL DEFAULT 'outro',
  date date NOT NULL,
  minutes integer NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_logs TO authenticated;
GRANT ALL ON public.time_logs TO service_role;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_time_logs" ON public.time_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== SHEETS CONFIG ===========
CREATE TABLE public.sheets_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  embed_url text NOT NULL,
  name text NOT NULL DEFAULT 'Planilha Financeira',
  height integer NOT NULL DEFAULT 520,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sheets_config TO authenticated;
GRANT ALL ON public.sheets_config TO service_role;
ALTER TABLE public.sheets_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_sheets_config" ON public.sheets_config FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

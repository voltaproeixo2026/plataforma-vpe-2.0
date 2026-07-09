-- Autenticidade maps: one row per user
CREATE TABLE public.autenticidade_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_phase int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.autenticidade_maps TO authenticated;
GRANT ALL ON public.autenticidade_maps TO service_role;
ALTER TABLE public.autenticidade_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own map" ON public.autenticidade_maps FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER upd_autenticidade_maps BEFORE UPDATE ON public.autenticidade_maps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Arsenal entries
CREATE TABLE public.arsenal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  raw_content text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arsenal_entries TO authenticated;
GRANT ALL ON public.arsenal_entries TO service_role;
ALTER TABLE public.arsenal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own arsenal" ON public.arsenal_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER upd_arsenal_entries BEFORE UPDATE ON public.arsenal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stories bank
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  story_type text NOT NULL DEFAULT 'outro',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stories" ON public.stories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER upd_stories BEFORE UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
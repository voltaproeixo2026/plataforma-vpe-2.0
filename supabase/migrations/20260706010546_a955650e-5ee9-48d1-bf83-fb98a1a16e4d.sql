
-- Contacts extra fields
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS temperatura text DEFAULT 'morno',
  ADD COLUMN IF NOT EXISTS prospeccao text,
  ADD COLUMN IF NOT EXISTS acionado_em date,
  ADD COLUMN IF NOT EXISTS follow_up_date date,
  ADD COLUMN IF NOT EXISTS follow_up_objective text;

-- Content cards extra fields
ALTER TABLE public.content_cards
  ADD COLUMN IF NOT EXISTS funil text DEFAULT 'atracao',
  ADD COLUMN IF NOT EXISTS etapa text DEFAULT 'roteiro',
  ADD COLUMN IF NOT EXISTS desenvolvimento text;

-- Tasks extra field
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS execution_status text DEFAULT 'fazer';

-- Funnels extra fields
ALTER TABLE public.funnels
  ADD COLUMN IF NOT EXISTS tested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted integer DEFAULT 0;

-- Cycle entries
CREATE TABLE IF NOT EXISTS public.cycle_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  cycle_day integer,
  cycle_length integer DEFAULT 28,
  emotion_scale integer,
  keyword text,
  creativity integer,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cycle_entries TO authenticated;
GRANT ALL ON public.cycle_entries TO service_role;
ALTER TABLE public.cycle_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_cycle_entries" ON public.cycle_entries;
CREATE POLICY "own_cycle_entries" ON public.cycle_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Restrict SECURITY DEFINER function execution to internal roles only
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

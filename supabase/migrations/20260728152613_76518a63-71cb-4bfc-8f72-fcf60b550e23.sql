ALTER TABLE public.content_cards
  ADD COLUMN IF NOT EXISTS link_referencia text,
  ADD COLUMN IF NOT EXISTS cta text;

CREATE TABLE IF NOT EXISTS public.pilares_conteudo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilares_conteudo TO authenticated;
GRANT ALL ON public.pilares_conteudo TO service_role;

ALTER TABLE public.pilares_conteudo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own pilares" ON public.pilares_conteudo;
CREATE POLICY "own pilares" ON public.pilares_conteudo
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_pilares_conteudo_updated_at ON public.pilares_conteudo;
CREATE TRIGGER update_pilares_conteudo_updated_at
  BEFORE UPDATE ON public.pilares_conteudo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.arsenal_entries
  ADD COLUMN IF NOT EXISTS pilar_id uuid REFERENCES public.pilares_conteudo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS arsenal_entries_pilar_id_idx ON public.arsenal_entries(pilar_id);
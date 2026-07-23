
-- 1. profiles.semana_fixada_id
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS semana_fixada_id uuid REFERENCES public.semanas(id) ON DELETE SET NULL;

-- 2. projetos_recorrentes
CREATE TYPE public.recorrencia_frequencia AS ENUM ('semanal');

CREATE TABLE public.projetos_recorrentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  tipo_id uuid NOT NULL REFERENCES public.tipos_projeto(id) ON DELETE RESTRICT,
  intencao_id uuid REFERENCES public.intencoes(id) ON DELETE SET NULL,
  frequencia public.recorrencia_frequencia NOT NULL DEFAULT 'semanal',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projetos_recorrentes TO authenticated;
GRANT ALL ON public.projetos_recorrentes TO service_role;
ALTER TABLE public.projetos_recorrentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_pr_all" ON public.projetos_recorrentes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_pr_updated BEFORE UPDATE ON public.projetos_recorrentes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. projetos.projeto_recorrente_id
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS projeto_recorrente_id uuid
    REFERENCES public.projetos_recorrentes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projetos_recorrente ON public.projetos(projeto_recorrente_id);

-- 4. projeto_semana_historico
CREATE TABLE public.projeto_semana_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  semana_id uuid REFERENCES public.semanas(id) ON DELETE SET NULL,
  data_transicao timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.projeto_semana_historico TO authenticated;
GRANT ALL ON public.projeto_semana_historico TO service_role;
ALTER TABLE public.projeto_semana_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_psh_select" ON public.projeto_semana_historico FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
-- inserts happen via SECURITY DEFINER trigger; block direct inserts otherwise
CREATE POLICY "own_psh_insert" ON public.projeto_semana_historico FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_psh_projeto ON public.projeto_semana_historico(projeto_id, data_transicao DESC);

-- 5. Trigger: registra transição de semana no projeto
CREATE OR REPLACE FUNCTION public.log_projeto_semana_transicao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- registrar somente quando semana_id realmente mudou e a semana anterior existia
  IF TG_OP = 'UPDATE' AND NEW.semana_id IS DISTINCT FROM OLD.semana_id AND OLD.semana_id IS NOT NULL THEN
    INSERT INTO public.projeto_semana_historico (user_id, projeto_id, semana_id)
    VALUES (NEW.user_id, NEW.id, OLD.semana_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_projetos_log_semana
  AFTER UPDATE OF semana_id ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION public.log_projeto_semana_transicao();

-- 6. Trigger: ao criar uma semana, gerar instâncias dos projetos recorrentes ativos
CREATE OR REPLACE FUNCTION public.gerar_instancias_recorrentes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.projetos (user_id, titulo, descricao, tipo_id, intencao_id, semana_id, status, projeto_recorrente_id)
  SELECT pr.user_id,
         pr.titulo || ' (' || NEW.nome || ')',
         pr.descricao,
         pr.tipo_id,
         pr.intencao_id,
         NEW.id,
         'ativo',
         pr.id
  FROM public.projetos_recorrentes pr
  WHERE pr.user_id = NEW.user_id
    AND pr.ativo = true
    AND pr.frequencia = 'semanal';
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_semanas_gerar_recorrentes
  AFTER INSERT ON public.semanas
  FOR EACH ROW EXECUTE FUNCTION public.gerar_instancias_recorrentes();


-- Enums
CREATE TYPE public.ciclo_status AS ENUM ('ativo','concluido');
CREATE TYPE public.projeto_status AS ENUM ('planejamento','ativo','concluido','cancelado');
CREATE TYPE public.tarefa_status AS ENUM ('a_fazer','em_progresso','concluida','cancelada');
CREATE TYPE public.registro_origem AS ENUM ('manual','cronometro');

-- CICLOS
CREATE TABLE public.ciclos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  status public.ciclo_status NOT NULL DEFAULT 'ativo',
  reflexao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ciclos TO authenticated;
GRANT ALL ON public.ciclos TO service_role;
ALTER TABLE public.ciclos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ciclos" ON public.ciclos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_ciclos_upd BEFORE UPDATE ON public.ciclos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEMANAS
CREATE TABLE public.semanas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ciclo_id uuid NOT NULL REFERENCES public.ciclos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  ordem_no_ciclo int NOT NULL DEFAULT 1,
  descanso boolean NOT NULL DEFAULT false,
  gerada_automaticamente boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.semanas TO authenticated;
GRANT ALL ON public.semanas TO service_role;
ALTER TABLE public.semanas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own semanas" ON public.semanas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_semanas_upd BEFORE UPDATE ON public.semanas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INTENCOES
CREATE TABLE public.intencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  periodo_inicio date NOT NULL DEFAULT CURRENT_DATE,
  periodo_fim date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intencoes TO authenticated;
GRANT ALL ON public.intencoes TO service_role;
ALTER TABLE public.intencoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own intencoes" ON public.intencoes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_intencoes_upd BEFORE UPDATE ON public.intencoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TIPOS_PROJETO
CREATE TABLE public.tipos_projeto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  cor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipos_projeto TO authenticated;
GRANT ALL ON public.tipos_projeto TO service_role;
ALTER TABLE public.tipos_projeto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tipos" ON public.tipos_projeto FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_tipos_upd BEFORE UPDATE ON public.tipos_projeto FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PROJETOS
CREATE TABLE public.projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  tipo_id uuid NOT NULL REFERENCES public.tipos_projeto(id) ON DELETE RESTRICT,
  intencao_id uuid REFERENCES public.intencoes(id) ON DELETE SET NULL,
  semana_id uuid REFERENCES public.semanas(id) ON DELETE SET NULL,
  status public.projeto_status NOT NULL DEFAULT 'planejamento',
  percentual_conclusao numeric NOT NULL DEFAULT 0,
  horas_totais numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projetos TO authenticated;
GRANT ALL ON public.projetos TO service_role;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projetos" ON public.projetos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_projetos_upd BEFORE UPDATE ON public.projetos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validação: projeto ativo requer semana
CREATE OR REPLACE FUNCTION public.validate_projeto_ativo()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'ativo' AND NEW.semana_id IS NULL THEN
    RAISE EXCEPTION 'Projeto ativo precisa de uma semana vinculada';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_projeto_valida BEFORE INSERT OR UPDATE ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION public.validate_projeto_ativo();

-- TAREFAS_PROJETO
CREATE TABLE public.tarefas_projeto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.tarefas_projeto(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  status public.tarefa_status NOT NULL DEFAULT 'a_fazer',
  data date,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas_projeto TO authenticated;
GRANT ALL ON public.tarefas_projeto TO service_role;
ALTER TABLE public.tarefas_projeto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tarefas_projeto" ON public.tarefas_projeto FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_tp_upd BEFORE UPDATE ON public.tarefas_projeto FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recalcular percentual (folhas)
CREATE OR REPLACE FUNCTION public.recalc_projeto_percentual(_projeto uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE total int; concl int; pct numeric;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status='concluida')
    INTO total, concl
  FROM public.tarefas_projeto t
  WHERE t.projeto_id = _projeto
    AND NOT EXISTS (SELECT 1 FROM public.tarefas_projeto c WHERE c.parent_id = t.id);
  IF total = 0 THEN pct := 0; ELSE pct := (concl::numeric / total::numeric) * 100; END IF;
  UPDATE public.projetos SET percentual_conclusao = ROUND(pct, 2) WHERE id = _projeto;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recalc_percentual()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_projeto_percentual(OLD.projeto_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_projeto_percentual(NEW.projeto_id);
    IF TG_OP='UPDATE' AND OLD.projeto_id <> NEW.projeto_id THEN
      PERFORM public.recalc_projeto_percentual(OLD.projeto_id);
    END IF;
    RETURN NEW;
  END IF;
END; $$;
CREATE TRIGGER trg_tp_pct AFTER INSERT OR UPDATE OR DELETE ON public.tarefas_projeto
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_percentual();

-- REGISTROS_TEMPO
CREATE TABLE public.registros_tempo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  tipo_id uuid REFERENCES public.tipos_projeto(id) ON DELETE SET NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  duracao_minutos int NOT NULL,
  origem public.registro_origem NOT NULL DEFAULT 'manual',
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registros_tempo TO authenticated;
GRANT ALL ON public.registros_tempo TO service_role;
ALTER TABLE public.registros_tempo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own registros_tempo" ON public.registros_tempo FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_rt_upd BEFORE UPDATE ON public.registros_tempo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Herança de tipo
CREATE OR REPLACE FUNCTION public.rt_herda_tipo()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tipo_id IS NULL THEN
    SELECT tipo_id INTO NEW.tipo_id FROM public.projetos WHERE id = NEW.projeto_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_rt_herda BEFORE INSERT ON public.registros_tempo
  FOR EACH ROW EXECUTE FUNCTION public.rt_herda_tipo();

-- Recalcular horas
CREATE OR REPLACE FUNCTION public.recalc_projeto_horas(_projeto uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE mins int;
BEGIN
  SELECT COALESCE(SUM(duracao_minutos),0) INTO mins FROM public.registros_tempo WHERE projeto_id = _projeto;
  UPDATE public.projetos SET horas_totais = ROUND(mins::numeric / 60.0, 2) WHERE id = _projeto;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recalc_horas()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    PERFORM public.recalc_projeto_horas(OLD.projeto_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_projeto_horas(NEW.projeto_id);
    IF TG_OP='UPDATE' AND OLD.projeto_id <> NEW.projeto_id THEN
      PERFORM public.recalc_projeto_horas(OLD.projeto_id);
    END IF;
    RETURN NEW;
  END IF;
END; $$;
CREATE TRIGGER trg_rt_horas AFTER INSERT OR UPDATE OR DELETE ON public.registros_tempo
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_horas();

-- Bloqueio de exclusão de tipo em uso (também garantido pelo FK RESTRICT, mas com mensagem amigável)
CREATE OR REPLACE FUNCTION public.tipo_delete_guard()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n int;
BEGIN
  SELECT COUNT(*) INTO n FROM public.projetos WHERE tipo_id = OLD.id;
  IF n > 0 THEN
    RAISE EXCEPTION 'Tipo em uso por % projeto(s). Reatribua antes de excluir.', n;
  END IF;
  RETURN OLD;
END; $$;
CREATE TRIGGER trg_tipo_delete BEFORE DELETE ON public.tipos_projeto
  FOR EACH ROW EXECUTE FUNCTION public.tipo_delete_guard();

-- Índices úteis
CREATE INDEX idx_semanas_ciclo ON public.semanas(ciclo_id);
CREATE INDEX idx_projetos_user ON public.projetos(user_id);
CREATE INDEX idx_projetos_semana ON public.projetos(semana_id);
CREATE INDEX idx_projetos_tipo ON public.projetos(tipo_id);
CREATE INDEX idx_tp_projeto ON public.tarefas_projeto(projeto_id);
CREATE INDEX idx_tp_parent ON public.tarefas_projeto(parent_id);
CREATE INDEX idx_rt_projeto ON public.registros_tempo(projeto_id);
CREATE INDEX idx_rt_user_data ON public.registros_tempo(user_id, data);

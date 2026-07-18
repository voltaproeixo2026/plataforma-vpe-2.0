
-- 1) updated_at helper (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- 2) projetos.percentual_conclusao
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS percentual_conclusao numeric NOT NULL DEFAULT 0;

-- 3) tarefas_projeto (recriar se faltando)
CREATE TABLE IF NOT EXISTS public.tarefas_projeto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  projeto_id uuid NOT NULL,
  parent_id uuid,
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'a_fazer',
  data date,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas_projeto TO authenticated;
GRANT ALL ON public.tarefas_projeto TO service_role;

ALTER TABLE public.tarefas_projeto ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tarefas_projeto' AND policyname='Owner all tarefas_projeto') THEN
    CREATE POLICY "Owner all tarefas_projeto" ON public.tarefas_projeto FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4) Add FKs (idempotent via DO blocks)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='semanas_ciclo_id_fkey') THEN
    ALTER TABLE public.semanas ADD CONSTRAINT semanas_ciclo_id_fkey
      FOREIGN KEY (ciclo_id) REFERENCES public.ciclos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='projetos_tipo_id_fkey') THEN
    ALTER TABLE public.projetos ADD CONSTRAINT projetos_tipo_id_fkey
      FOREIGN KEY (tipo_id) REFERENCES public.tipos_projeto(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='projetos_intencao_id_fkey') THEN
    ALTER TABLE public.projetos ADD CONSTRAINT projetos_intencao_id_fkey
      FOREIGN KEY (intencao_id) REFERENCES public.intencoes(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='projetos_semana_id_fkey') THEN
    ALTER TABLE public.projetos ADD CONSTRAINT projetos_semana_id_fkey
      FOREIGN KEY (semana_id) REFERENCES public.semanas(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tarefas_projeto_projeto_id_fkey') THEN
    ALTER TABLE public.tarefas_projeto ADD CONSTRAINT tarefas_projeto_projeto_id_fkey
      FOREIGN KEY (projeto_id) REFERENCES public.projetos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tarefas_projeto_parent_id_fkey') THEN
    ALTER TABLE public.tarefas_projeto ADD CONSTRAINT tarefas_projeto_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES public.tarefas_projeto(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='registros_tempo_projeto_id_fkey') THEN
    ALTER TABLE public.registros_tempo ADD CONSTRAINT registros_tempo_projeto_id_fkey
      FOREIGN KEY (projeto_id) REFERENCES public.projetos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='registros_tempo_tipo_id_fkey') THEN
    ALTER TABLE public.registros_tempo ADD CONSTRAINT registros_tempo_tipo_id_fkey
      FOREIGN KEY (tipo_id) REFERENCES public.tipos_projeto(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5) updated_at triggers on all module tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ciclos','semanas','intencoes','tipos_projeto','projetos','registros_tempo','tarefas_projeto']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s;', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END $$;

-- 6) Recalc percentual_conclusao (leaf tasks only; cancelada conta como não concluída)
CREATE OR REPLACE FUNCTION public.recalc_projeto_percentual(_projeto uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE total int; done int;
BEGIN
  SELECT COUNT(*) INTO total FROM public.tarefas_projeto t
    WHERE t.projeto_id = _projeto
      AND NOT EXISTS (SELECT 1 FROM public.tarefas_projeto c WHERE c.parent_id = t.id);
  SELECT COUNT(*) INTO done FROM public.tarefas_projeto t
    WHERE t.projeto_id = _projeto
      AND t.status = 'concluida'
      AND NOT EXISTS (SELECT 1 FROM public.tarefas_projeto c WHERE c.parent_id = t.id);
  UPDATE public.projetos
    SET percentual_conclusao = CASE WHEN total = 0 THEN 0 ELSE ROUND((done::numeric / total) * 100, 2) END
    WHERE id = _projeto;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recalc_percentual()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP='DELETE' THEN
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

DROP TRIGGER IF EXISTS trg_tarefas_recalc_percentual ON public.tarefas_projeto;
CREATE TRIGGER trg_tarefas_recalc_percentual
AFTER INSERT OR UPDATE OR DELETE ON public.tarefas_projeto
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_percentual();

-- 7) Recalc horas_totais on registros_tempo changes
DROP TRIGGER IF EXISTS trg_registros_recalc_horas ON public.registros_tempo;
CREATE TRIGGER trg_registros_recalc_horas
AFTER INSERT OR UPDATE OR DELETE ON public.registros_tempo
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_horas();

-- 8) Registros_tempo: herdar tipo_id do projeto (BEFORE INSERT)
DROP TRIGGER IF EXISTS trg_registros_herda_tipo ON public.registros_tempo;
CREATE TRIGGER trg_registros_herda_tipo
BEFORE INSERT ON public.registros_tempo
FOR EACH ROW EXECUTE FUNCTION public.rt_herda_tipo();

-- 9) Projeto ativo requer semana
DROP TRIGGER IF EXISTS trg_projetos_valida_ativo ON public.projetos;
CREATE TRIGGER trg_projetos_valida_ativo
BEFORE INSERT OR UPDATE ON public.projetos
FOR EACH ROW EXECUTE FUNCTION public.validate_projeto_ativo();

-- 10) Tipo com projetos vinculados não pode ser excluído
DROP TRIGGER IF EXISTS trg_tipos_delete_guard ON public.tipos_projeto;
CREATE TRIGGER trg_tipos_delete_guard
BEFORE DELETE ON public.tipos_projeto
FOR EACH ROW EXECUTE FUNCTION public.tipo_delete_guard();

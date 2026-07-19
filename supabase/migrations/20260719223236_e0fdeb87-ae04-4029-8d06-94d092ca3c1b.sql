
-- Foreign keys físicas (evita duplicar se já existirem)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='semanas_ciclo_id_fkey') THEN
    ALTER TABLE public.semanas ADD CONSTRAINT semanas_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='projetos_tipo_id_fkey') THEN
    ALTER TABLE public.projetos ADD CONSTRAINT projetos_tipo_id_fkey FOREIGN KEY (tipo_id) REFERENCES public.tipos_projeto(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='projetos_intencao_id_fkey') THEN
    ALTER TABLE public.projetos ADD CONSTRAINT projetos_intencao_id_fkey FOREIGN KEY (intencao_id) REFERENCES public.intencoes(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='projetos_semana_id_fkey') THEN
    ALTER TABLE public.projetos ADD CONSTRAINT projetos_semana_id_fkey FOREIGN KEY (semana_id) REFERENCES public.semanas(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tarefas_projeto_projeto_id_fkey') THEN
    ALTER TABLE public.tarefas_projeto ADD CONSTRAINT tarefas_projeto_projeto_id_fkey FOREIGN KEY (projeto_id) REFERENCES public.projetos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tarefas_projeto_parent_id_fkey') THEN
    ALTER TABLE public.tarefas_projeto ADD CONSTRAINT tarefas_projeto_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.tarefas_projeto(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='registros_tempo_projeto_id_fkey') THEN
    ALTER TABLE public.registros_tempo ADD CONSTRAINT registros_tempo_projeto_id_fkey FOREIGN KEY (projeto_id) REFERENCES public.projetos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='registros_tempo_tipo_id_fkey') THEN
    ALTER TABLE public.registros_tempo ADD CONSTRAINT registros_tempo_tipo_id_fkey FOREIGN KEY (tipo_id) REFERENCES public.tipos_projeto(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Recalcular horas_totais para todos os projetos existentes (com base nos registros já lançados)
UPDATE public.projetos p
SET horas_totais = ROUND(COALESCE(sub.mins,0)::numeric / 60.0, 2)
FROM (
  SELECT projeto_id, SUM(duracao_minutos) AS mins
  FROM public.registros_tempo
  GROUP BY projeto_id
) sub
WHERE p.id = sub.projeto_id;

UPDATE public.projetos SET horas_totais = 0
WHERE NOT EXISTS (SELECT 1 FROM public.registros_tempo r WHERE r.projeto_id = projetos.id);

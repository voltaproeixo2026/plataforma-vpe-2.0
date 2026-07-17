
-- Remove tarefas do módulo Atividades
DROP TRIGGER IF EXISTS trg_tp_pct ON public.tarefas_projeto;
DROP TRIGGER IF EXISTS trg_recalc_percentual ON public.tarefas_projeto;
DROP FUNCTION IF EXISTS public.trg_recalc_percentual() CASCADE;
DROP FUNCTION IF EXISTS public.recalc_projeto_percentual(uuid) CASCADE;
DROP TABLE IF EXISTS public.tarefas_projeto CASCADE;
DROP TYPE IF EXISTS public.tarefa_status;

-- percentual_conclusao deixa de existir (sem base de cálculo)
ALTER TABLE public.projetos DROP COLUMN IF EXISTS percentual_conclusao;

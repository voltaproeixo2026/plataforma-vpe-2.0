
-- Deduplicate ciclos ativos: keep the oldest one per user, mark others as concluido
WITH ranked AS (
  SELECT id, user_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) AS rn
  FROM public.ciclos
  WHERE status = 'ativo'
)
UPDATE public.ciclos c
SET status = 'concluido', data_fim = COALESCE(c.data_fim, CURRENT_DATE)
FROM ranked r
WHERE c.id = r.id AND r.rn > 1;

-- Prevent future duplicates: only one ciclo ativo per user
CREATE UNIQUE INDEX IF NOT EXISTS ciclos_one_ativo_per_user
  ON public.ciclos(user_id) WHERE status = 'ativo';

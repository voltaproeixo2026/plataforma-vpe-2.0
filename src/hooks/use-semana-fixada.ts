import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Preferência de "semana fixada" — persistida em profiles.semana_fixada_id
 * e usada como default nos filtros de semana das telas de Atividades.
 *
 * Convenção do valor no UI:
 *   "" (string vazia) = "Todas" / desafixado
 *   uuid              = semana selecionada
 */
export function useSemanaFixada() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["semana-fixada", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("semana_fixada_id")
        .eq("id", uid!)
        .maybeSingle();
      return (data?.semana_fixada_id as string | null) ?? null;
    },
  });

  const set = async (semanaId: string) => {
    if (!uid) return;
    const value = semanaId || null;
    await supabase.from("profiles").update({ semana_fixada_id: value }).eq("id", uid);
    qc.setQueryData(["semana-fixada", uid], value);
  };

  return { semanaFixada: q.data ?? null, loading: q.isLoading, setSemanaFixada: set };
}

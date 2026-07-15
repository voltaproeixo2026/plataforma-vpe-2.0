import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/ui-custom";
import { classifyDate, fmtDateBR } from "@/lib/atividades";

export function AtividadesLista({ userId, onOpenProjeto }: { userId: string; onOpenProjeto: (id: string) => void }) {
  const { data: tarefas = [] } = useQuery({
    queryKey: ["tarefas-com-data", userId],
    queryFn: async () => (await supabase
      .from("tarefas_projeto")
      .select("*, projetos(id, titulo, tipos_projeto(nome, cor))")
      .eq("user_id", userId)
      .not("data", "is", null)
      .neq("status", "concluida")
      .neq("status", "cancelada")
      .order("data")).data || [],
  });

  const groups = useMemo(() => {
    const g: Record<string, any[]> = { atrasada: [], hoje: [], proxima: [] };
    tarefas.forEach((t: any) => {
      const c = classifyDate(t.data);
      if (c) g[c].push(t);
    });
    return g;
  }, [tarefas]);

  const Section = ({ title, list, tint }: { title: string; list: any[]; tint: string }) => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ background: tint }} />
        <div className="label-mono">{title} ({list.length})</div>
      </div>
      {list.length === 0 ? <div className="text-xs font-mono text-text-tertiary">Vazio</div> : (
        <ul className="space-y-2">
          {list.map((t: any) => (
            <li key={t.id} className="flex items-center gap-3 p-3 bg-bg-primary border border-border rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-primary">{t.titulo}</div>
                <button onClick={() => onOpenProjeto(t.projetos?.id)} className="text-xs font-mono text-text-tertiary hover:text-terracota">
                  {t.projetos?.tipos_projeto?.nome} · {t.projetos?.titulo}
                </button>
              </div>
              <div className="text-xs font-mono text-text-tertiary">{fmtDateBR(t.data)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (tarefas.length === 0) return <EmptyState icon="✅" text="Nenhuma tarefa datada" />;

  return (
    <div>
      <Section title="Atrasadas" list={groups.atrasada} tint="var(--terracota)" />
      <Section title="Hoje" list={groups.hoje} tint="var(--gold)" />
      <Section title="Próximas" list={groups.proxima} tint="var(--sage)" />
    </div>
  );
}

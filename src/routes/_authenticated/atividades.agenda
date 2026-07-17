import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState, Tag } from "@/components/ui-custom";
import { TAREFA_STATUS } from "@/lib/atividades-helpers";

export const Route = createFileRoute("/_authenticated/atividades/agenda")({
  component: AgendaAtividadesPage,
});

function AgendaAtividadesPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const hoje = new Date().toISOString().slice(0, 10);

  const { data: tarefas = [] } = useQuery({
    queryKey: ["tarefas_com_data", uid],
    queryFn: async () => {
      const { data } = await supabase
        .from("tarefas_projeto")
        .select("id,titulo,status,data,projeto_id,projetos(titulo,tipos_projeto(nome,cor),semanas(nome))")
        .eq("user_id", uid)
        .not("data", "is", null)
        .neq("status", "concluida")
        .neq("status", "cancelada")
        .order("data", { ascending: true });
      return data ?? [];
    },
  });

  const atrasadas = tarefas.filter((t: any) => t.data < hoje);
  const hojeLista = tarefas.filter((t: any) => t.data === hoje);
  const proximas = tarefas.filter((t: any) => t.data > hoje);

  return (
    <div>
      <PageHeader title="Atividades com data" subtitle="Visualização rápida do que tem dia marcado" />
      {tarefas.length === 0 ? (
        <EmptyState icon="📅" text="Nenhuma atividade com data pendente" />
      ) : (
        <div className="space-y-5">
          <GrupoAgenda titulo="Hoje" tarefas={hojeLista} destaque="terracota" />
          <GrupoAgenda titulo="Atrasadas" tarefas={atrasadas} destaque="amber" />
          <GrupoAgenda titulo="Próximas" tarefas={proximas} destaque="sage" />
        </div>
      )}
    </div>
  );
}

function GrupoAgenda({ titulo, tarefas, destaque }: { titulo: string; tarefas: any[]; destaque: "terracota" | "amber" | "sage" }) {
  if (tarefas.length === 0) return null;
  return (
    <section>
      <div className="label-mono mb-2">{titulo}</div>
      <div className="space-y-2">
        {tarefas.map((t) => {
          const status = TAREFA_STATUS.find((s) => s.key === t.status);
          const projeto = Array.isArray(t.projetos) ? t.projetos[0] : t.projetos;
          return (
            <Link
              key={t.id}
              to="/atividades/projeto/$id"
              params={{ id: t.projeto_id }}
              className="bg-bg-primary border border-border rounded-xl p-4 hover:border-terracota transition flex items-center gap-3"
            >
              <div className="w-11 h-11 rounded-lg bg-bg-secondary flex items-center justify-center text-terracota flex-shrink-0">
                <CalendarDays size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg truncate">{t.titulo}</div>
                <div className="text-xs font-mono text-text-tertiary mt-0.5">
                  {new Date(t.data + "T12:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                  {projeto?.titulo && ` · ${projeto.titulo}`}
                  {projeto?.semanas?.nome && ` · ${projeto.semanas.nome}`}
                </div>
              </div>
              <Tag color={destaque}>{status?.label ?? t.status}</Tag>
              <ChevronRight size={16} className="text-text-tertiary" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

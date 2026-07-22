import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CICLO_TAMANHO, ensureActiveCiclo, semanaAtualParaHoje } from "@/lib/atividades";

export const Route = createFileRoute("/_authenticated/atividades")({
  head: () => ({ meta: [{ title: "Atividades — Volta Pro Eixo" }] }),
  component: AtividadesLayout,
});

function AtividadesLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const uid = user?.id;

  useEffect(() => { if (uid) ensureActiveCiclo(uid); }, [uid]);

  const { data: cicloAtivo } = useQuery({
    queryKey: ["ciclo_ativo", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("ciclos")
        .select("*")
        .eq("user_id", uid!)
        .eq("status", "ativo")
        .order("created_at", { ascending: true })
        .limit(1);
      if (data && data.length > 0) return data[0];
      return await ensureActiveCiclo(uid!);
    },
  });
  const { data: semanasCiclo = [] } = useQuery({
    queryKey: ["semanas_ciclo", cicloAtivo?.id],
    enabled: !!cicloAtivo?.id,
    queryFn: async () =>
      (await supabase.from("semanas").select("*").eq("ciclo_id", cicloAtivo!.id).order("data_inicio")).data ?? [],
  });

  const semanaAtual = semanaAtualParaHoje(semanasCiclo);
  const posicao = semanaAtual?.ordem_no_ciclo ?? semanasCiclo.length;
  const pct = Math.min(100, (posicao / CICLO_TAMANHO) * 100);

  const tabs: { to: string; label: string; exact?: boolean }[] = [
  { to: "/atividades", label: "Projetos", exact: true },
  { to: "/atividades/semanas", label: "Gerenciar ciclo" },
  { to: "/atividades/agenda", label: "Agenda" },
  { to: "/atividades/intencoes", label: "Intenções" },
  { to: "/atividades/tipos", label: "Tipos" },
];

  return (
    <div>
      {cicloAtivo && (
        <div className="mb-4 bg-bg-secondary border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
          <div className="min-w-[180px]">
            <div className="font-mono text-xs text-text-tertiary">Ciclo atual</div>
            <div className="font-display text-lg">{cicloAtivo.nome}</div>
            <div className="text-xs font-mono text-text-tertiary mt-0.5">
              Semana {posicao || 0} de {CICLO_TAMANHO}
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-terracota transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-6 overflow-x-auto border-b border-border">
        {tabs.map((t) => {
          const active = t.exact
            ? path === t.to || path.startsWith("/atividades/projeto")
            : path === t.to;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`px-4 py-2 font-mono text-sm border-b-2 transition whitespace-nowrap ${active ? "border-terracota text-terracota" : "border-transparent text-text-tertiary hover:text-text-primary"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}

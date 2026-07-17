import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, Chip } from "@/components/ui-custom";
import { fmtHoras, fmtDateBR, todayISO, addDays } from "@/lib/atividades";

type Periodo = "7" | "14" | "30" | "semana";

function getMondayISO(): string {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - dow);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function rangeFor(periodo: Periodo): { inicio: string; fim: string } {
  const hoje = todayISO();
  if (periodo === "semana") {
    const inicio = getMondayISO();
    return { inicio, fim: addDays(inicio, 6) };
  }
  const dias = parseInt(periodo, 10);
  return { inicio: addDays(hoje, -(dias - 1)), fim: hoje };
}

export function RegistroTempoLista({ userId }: { userId: string }) {
  const [periodo, setPeriodo] = useState<Periodo>("7");
  const { inicio, fim } = useMemo(() => rangeFor(periodo), [periodo]);

  const { data: registros = [] } = useQuery({
    queryKey: ["registros-tempo-consolidado", userId, inicio, fim],
    queryFn: async () => {
      const { data } = await supabase
        .from("registros_tempo")
        .select("*, projetos(id, titulo, tipos_projeto(nome, cor))")
        .eq("user_id", userId)
        .gte("data", inicio)
        .lte("data", fim)
        .order("data", { ascending: false });
      return data || [];
    },
  });

  const totalMin = registros.reduce((a: number, r: any) => a + (r.duracao_minutos || 0), 0);

  return (
    <div>
      <p className="text-sm text-text-secondary mb-4">
        Histórico consolidado de todo o tempo registrado nos projetos. Novos registros são criados no botão
        <span className="font-mono text-terracota"> “+ registrar horas”</span> dentro de cada projeto.
      </p>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <span className="label-mono mr-1">Período:</span>
        <Chip active={periodo === "7"} onClick={() => setPeriodo("7")}>Últimos 7 dias</Chip>
        <Chip active={periodo === "14"} onClick={() => setPeriodo("14")}>Últimos 14 dias</Chip>
        <Chip active={periodo === "30"} onClick={() => setPeriodo("30")}>Últimos 30 dias</Chip>
        <Chip active={periodo === "semana"} onClick={() => setPeriodo("semana")}>Esta semana (seg–dom)</Chip>
      </div>

      <div className="bg-bg-primary border border-border rounded-xl p-5">
        <div className="flex justify-between items-center mb-3">
          <div className="label-mono">{fmtDateBR(inicio)} → {fmtDateBR(fim)}</div>
          <div className="font-mono text-sm text-text-secondary">Total: {fmtHoras(totalMin / 60)}</div>
        </div>
        {registros.length === 0 ? <EmptyState icon="⏱" text="Nenhum registro no período" /> : (
          <ul className="divide-y divide-border">
            {registros.map((r: any) => (
              <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.projetos?.tipos_projeto?.cor || "#999" }} />
                <span className="font-mono text-xs text-text-tertiary w-20">{fmtDateBR(r.data)}</span>
                <span className="flex-1 truncate">
                  <span className="text-text-primary">{r.projetos?.titulo || "—"}</span>
                  <span className="text-text-tertiary"> · {r.projetos?.tipos_projeto?.nome || "—"}</span>
                  {r.observacao && <span className="text-text-tertiary"> — {r.observacao}</span>}
                </span>
                <span className="font-mono text-[10px] text-text-tertiary">{r.origem}</span>
                <span className="font-mono text-xs w-16 text-right">{fmtHoras(r.duracao_minutos / 60)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

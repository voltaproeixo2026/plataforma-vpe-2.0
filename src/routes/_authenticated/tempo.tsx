import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState, Chip, Btn, inputCls } from "@/components/ui-custom";
import { fmtHoras, fmtDateBR, todayISO, addDays } from "@/lib/atividades";
import { Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tempo")({
  head: () => ({ meta: [{ title: "Registro de Tempo — Volta Pro Eixo" }] }),
  component: TempoPage,
});

type Periodo = "7" | "14" | "30" | "semana";

function getMondayISO(): string {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7;
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

function TempoPage() {
  const { user } = useAuth();
  if (!user) return null;
  const uid = user.id;
  const qc = useQueryClient();

  const [periodo, setPeriodo] = useState<Periodo>("7");
  const { inicio, fim } = useMemo(() => rangeFor(periodo), [periodo]);

  const { data: registros = [] } = useQuery({
    queryKey: ["tempo-registros", uid, inicio, fim],
    queryFn: async () => {
      const { data } = await supabase
        .from("registros_tempo")
        .select("*, projetos(id, titulo, tipos_projeto(id, nome, cor))")
        .eq("user_id", uid)
        .gte("data", inicio)
        .lte("data", fim)
        .order("data", { ascending: false });
      return data || [];
    },
  });

  const totalMin = registros.reduce((a: number, r: any) => a + (r.duracao_minutos || 0), 0);

  // Distribuição por tipo de projeto
  const porTipo = useMemo(() => {
    const map = new Map<string, { nome: string; cor: string; mins: number }>();
    for (const r of registros as any[]) {
      const t = r.projetos?.tipos_projeto;
      const key = t?.id ?? "sem-tipo";
      const nome = t?.nome ?? "Sem tipo";
      const cor = t?.cor ?? "#999";
      const prev = map.get(key) ?? { nome, cor, mins: 0 };
      prev.mins += r.duracao_minutos || 0;
      map.set(key, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.mins - a.mins);
  }, [registros]);

  // Histórico mensal (accordion) — últimos 6 meses
  const { data: historico = [] } = useQuery({
    queryKey: ["tempo-historico", uid],
    queryFn: async () => {
      const hoje = new Date();
      const inicio6 = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1)
        .toISOString().slice(0, 10);
      const { data } = await supabase
        .from("registros_tempo")
        .select("*, projetos(titulo, tipos_projeto(nome, cor))")
        .eq("user_id", uid)
        .gte("data", inicio6)
        .order("data", { ascending: false });
      return data || [];
    },
  });

  const historicoPorMes = useMemo(() => {
    const map = new Map<string, { label: string; total: number; items: any[] }>();
    for (const r of historico as any[]) {
      const key = r.data.slice(0, 7);
      const [y, m] = key.split("-");
      const label = new Date(+y, +m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      const prev = map.get(key) ?? { label, total: 0, items: [] };
      prev.total += r.duracao_minutos || 0;
      prev.items.push(r);
      map.set(key, prev);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [historico]);

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["tempo-registros"] });
    qc.invalidateQueries({ queryKey: ["tempo-historico"] });
    qc.invalidateQueries({ queryKey: ["registros-tempo-consolidado"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este registro?")) return;
    const { error } = await supabase.from("registros_tempo").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Removido");
    inv();
  };

  return (
    <div>
      <PageHeader title="Registro de Tempo" subtitle="Visualização de todo o tempo registrado nos projetos. Novos registros são criados no botão “+ registrar horas” dentro de cada projeto." />

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <span className="label-mono mr-1">Período:</span>
        <Chip active={periodo === "7"} onClick={() => setPeriodo("7")}>Últimos 7 dias</Chip>
        <Chip active={periodo === "14"} onClick={() => setPeriodo("14")}>Últimos 14 dias</Chip>
        <Chip active={periodo === "30"} onClick={() => setPeriodo("30")}>Últimos 30 dias</Chip>
        <Chip active={periodo === "semana"} onClick={() => setPeriodo("semana")}>Esta semana (seg–dom)</Chip>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-bg-primary border border-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <div className="label-mono">Distribuição por tipo</div>
            <div className="font-mono text-sm text-text-secondary">Total: {fmtHoras(totalMin / 60)}</div>
          </div>
          {porTipo.length === 0 ? (
            <EmptyState icon="🥧" text="Sem dados no período" />
          ) : (
            <div className="grid md:grid-cols-[180px_1fr] gap-4 items-center">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={porTipo}
                      dataKey="mins"
                      nameKey="nome"
                      innerRadius={40}
                      outerRadius={70}
                      stroke="none"
                    >
                      {porTipo.map((p, i) => <Cell key={i} fill={p.cor} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, _n: any, e: any) => [fmtHoras((v as number) / 60), e.payload.nome]}
                      contentStyle={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 text-sm">
                {porTipo.map((p) => {
                  const perc = totalMin > 0 ? Math.round((p.mins / totalMin) * 100) : 0;
                  return (
                    <li key={p.nome} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.cor }} />
                      <span className="flex-1 truncate">{p.nome}</span>
                      <span className="font-mono text-xs text-text-tertiary">{fmtHoras(p.mins / 60)} · {perc}%</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-bg-primary border border-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <div className="label-mono">{fmtDateBR(inicio)} → {fmtDateBR(fim)}</div>
            <div className="font-mono text-xs text-text-tertiary">{registros.length} registros</div>
          </div>
          {registros.length === 0 ? <EmptyState icon="⏱" text="Nenhum registro no período" /> : (
            <ul className="divide-y divide-border max-h-[280px] overflow-y-auto">
              {registros.map((r: any) => (
                <RegistroRow key={r.id} r={r} onSaved={inv} onDelete={() => remove(r.id)} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-bg-primary border border-border rounded-xl p-5">
        <div className="label-mono mb-3">Histórico</div>
        {historicoPorMes.length === 0 ? (
          <EmptyState icon="📅" text="Sem histórico ainda" />
        ) : (
          <ul className="divide-y divide-border">
            {historicoPorMes.map(([key, mes]) => (
              <MesAccordion key={key} label={mes.label} total={mes.total} items={mes.items} onChanged={inv} onDelete={remove} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MesAccordion({ label, total, items, onChanged, onDelete }: any) {
  const [open, setOpen] = useState(false);
  return (
    <li className="py-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left hover:text-terracota transition"
      >
        <span className="font-display text-lg capitalize">{open ? "▾" : "▸"} {label}</span>
        <span className="font-mono text-sm text-text-secondary">{fmtHoras(total / 60)} · {items.length} registros</span>
      </button>
      {open && (
        <ul className="divide-y divide-border mt-2">
          {items.map((r: any) => (
            <RegistroRow key={r.id} r={r} onSaved={onChanged} onDelete={() => onDelete(r.id)} />
          ))}
        </ul>
      )}
    </li>
  );
}

function RegistroRow({ r, onSaved, onDelete }: any) {
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState<string>(r.data);
  const [horas, setHoras] = useState<number>(Math.floor((r.duracao_minutos || 0) / 60));
  const [mins, setMins] = useState<number>((r.duracao_minutos || 0) % 60);
  const [obs, setObs] = useState<string>(r.observacao ?? "");

  const cor = r.projetos?.tipos_projeto?.cor || "#999";

  const save = async () => {
    const total = Math.max(1, horas * 60 + mins);
    const { error } = await supabase.from("registros_tempo")
      .update({ data, duracao_minutos: total, observacao: obs || null })
      .eq("id", r.id);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Atualizado");
    setEditing(false);
    onSaved?.();
  };

  if (editing) {
    return (
      <li className="py-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cor }} />
        <input type="date" className={inputCls + " !w-36"} value={data} onChange={(e) => setData(e.target.value)} />
        <input type="number" min={0} className={inputCls + " !w-16"} value={horas} onChange={(e) => setHoras(+e.target.value || 0)} />
        <span className="text-xs text-text-tertiary">h</span>
        <input type="number" min={0} max={59} className={inputCls + " !w-16"} value={mins} onChange={(e) => setMins(+e.target.value || 0)} />
        <span className="text-xs text-text-tertiary">min</span>
        <input className={inputCls + " flex-1 min-w-[140px]"} placeholder="Observação" value={obs} onChange={(e) => setObs(e.target.value)} />
        <Btn onClick={save}><Check size={14} /></Btn>
        <button onClick={() => setEditing(false)} className="text-text-tertiary hover:text-text-primary"><X size={14} /></button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cor }} />
      <span className="font-mono text-xs text-text-tertiary w-20">{fmtDateBR(r.data)}</span>
      <span className="flex-1 truncate">
        <span className="text-text-primary">{r.projetos?.titulo || "—"}</span>
        <span className="text-text-tertiary"> · {r.projetos?.tipos_projeto?.nome || "—"}</span>
        {r.observacao && <span className="text-text-tertiary"> — {r.observacao}</span>}
      </span>
      <span className="font-mono text-[10px] text-text-tertiary">{r.origem}</span>
      <span className="font-mono text-xs w-16 text-right">{fmtHoras((r.duracao_minutos || 0) / 60)}</span>
      <button onClick={() => setEditing(true)} className="text-text-tertiary hover:text-terracota"><Pencil size={14} /></button>
      <button onClick={onDelete} className="text-text-tertiary hover:text-[#e05c5c]"><X size={14} /></button>
    </li>
  );
}

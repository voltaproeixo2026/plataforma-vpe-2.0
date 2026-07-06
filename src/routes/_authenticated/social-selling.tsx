import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, Btn, Modal, Field, inputCls, ProgressBar, CounterCard } from "@/components/ui-custom";
import { getMonday, addDays, todayISO, monthRef, fmtBRL } from "@/lib/biz";
import { Settings } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/social-selling")({
  head: () => ({ meta: [{ title: "Abordagens — Painel" }] }),
  component: SSPage,
});

function SSPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const today = todayISO();
  const monday = getMonday(new Date());
  const sunday = addDays(monday, 6);
  const [openCfg, setOpenCfg] = useState(false);
  const [openRetro, setOpenRetro] = useState(false);
  const [range, setRange] = useState(7);
  const mref = monthRef();

  const { data: cfg } = useQuery({
    queryKey: ["ss_config", uid],
    queryFn: async () => {
      const { data } = await supabase.from("ss_config").select("*").maybeSingle();
      return data ?? { meta_day: 10, meta_week_reun: 3, taxa: 20, ticket: 2000 };
    },
  });

  const { data: todayCount } = useQuery({
    queryKey: ["ss_today", uid, today],
    queryFn: async () => {
      const { data } = await supabase.from("ss_counts").select("*").eq("date", today).maybeSingle();
      return data ?? { abordagem: 0, resposta: 0, reuniao: 0 };
    },
  });

  const { data: weekData } = useQuery({
    queryKey: ["ss_week", uid, monday.toISOString().slice(0, 10)],
    queryFn: async () => {
      const { data } = await supabase.from("ss_counts").select("*")
        .gte("date", monday.toISOString().slice(0, 10))
        .lte("date", sunday.toISOString().slice(0, 10));
      return data ?? [];
    },
  });

  const { data: history } = useQuery({
    queryKey: ["ss_history", uid, range],
    queryFn: async () => {
      const start = addDays(new Date(), -range + 1).toISOString().slice(0, 10);
      const { data } = await supabase.from("ss_counts").select("*").gte("date", start).order("date");
      return data ?? [];
    },
  });

  const { data: fatMonthAndMeta } = useQuery({
    queryKey: ["fat_for_ss", uid, mref],
    queryFn: async () => {
      const [e, m] = await Promise.all([
        supabase.from("fat_entries").select("value").like("date", `${mref}%`),
        supabase.from("fat_meta").select("value").eq("month_ref", mref).maybeSingle(),
      ]);
      return {
        fat: (e.data ?? []).reduce((a, b) => a + Number(b.value), 0),
        meta: Number(m.data?.value ?? 0),
      };
    },
  });

  const increment = async (field: "abordagem" | "resposta" | "reuniao", delta: number) => {
    const cur = todayCount ?? { abordagem: 0, resposta: 0, reuniao: 0 };
    const newVal = Math.max(0, (cur as any)[field] + delta);
    await supabase.from("ss_counts").upsert({ user_id: uid, date: today, ...cur, [field]: newVal }, { onConflict: "user_id,date" });
    qc.invalidateQueries({ queryKey: ["ss_today"] });
    qc.invalidateQueries({ queryKey: ["ss_week"] });
    qc.invalidateQueries({ queryKey: ["ss_history"] });
  };

  const weekAbord = (weekData ?? []).reduce((a, b) => a + (b.abordagem ?? 0), 0);
  const weekReun = (weekData ?? []).reduce((a, b) => a + (b.reuniao ?? 0), 0);
  const taxaResp = todayCount && (todayCount.abordagem ?? 0) > 0
    ? Math.round(((todayCount.resposta ?? 0) / (todayCount.abordagem ?? 1)) * 100) : 0;

  const falta = Math.max(0, (fatMonthAndMeta?.meta ?? 0) - (fatMonthAndMeta?.fat ?? 0));
  const ticket = Number(cfg?.ticket ?? 0);
  const taxa = Number(cfg?.taxa ?? 0);
  const vendasNec = ticket > 0 ? Math.ceil(falta / ticket) : 0;
  const abordagensNec = taxa > 0 ? Math.ceil(vendasNec / (taxa / 100)) : 0;
  const porDia = Math.ceil(abordagensNec / 20);

  const totalHist = (history ?? []).reduce((a, b) => a + (b.abordagem ?? 0), 0);

  return (
    <div>
      <PageHeader title="Abordagens" subtitle="Prospecção diária">
        <Btn variant="ghost" onClick={() => setOpenRetro(true)}>+ Retroativa</Btn>
        <Btn variant="ghost" onClick={() => setOpenCfg(true)}><Settings size={14} className="inline mr-1" />Metas</Btn>
      </PageHeader>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <CounterCard label="Abordagens hoje" value={todayCount?.abordagem ?? 0} sub={`Meta: ${cfg?.meta_day}/dia`}
          onInc={() => increment("abordagem", 1)} onDec={() => increment("abordagem", -1)} />
        <CounterCard label="Respostas hoje" value={todayCount?.resposta ?? 0} sub={`Taxa: ${taxaResp}%`}
          onInc={() => increment("resposta", 1)} onDec={() => increment("resposta", -1)} />
        <CounterCard label="Reuniões agendadas" value={todayCount?.reuniao ?? 0} sub={`Meta semana: ${cfg?.meta_week_reun}`}
          onInc={() => increment("reuniao", 1)} onDec={() => increment("reuniao", -1)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-bg-primary border border-border rounded-xl p-5">
          <div className="label-mono mb-3">Progresso da semana</div>
          <div className="space-y-3 mb-5">
            <ProgressBar value={weekAbord} max={(cfg?.meta_day ?? 10) * 5} color="var(--terracota)"
              leftLabel="Abordagens" rightLabel={`${weekAbord} / ${(cfg?.meta_day ?? 10) * 5}`} />
            <ProgressBar value={weekReun} max={cfg?.meta_week_reun ?? 3} color="var(--sage)"
              leftLabel="Reuniões" rightLabel={`${weekReun} / ${cfg?.meta_week_reun ?? 3}`} />
          </div>
          <div className="label-mono mb-2">Quanto preciso prospectar?</div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Falta faturar" value={fmtBRL(falta)} />
            <Stat label="Vendas necessárias" value={vendasNec} />
            <Stat label="Abordagens total" value={abordagensNec} />
            <Stat label="Por dia (~20)" value={porDia} />
          </div>
        </div>

        <div className="bg-bg-primary border border-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="label-mono">Histórico</div>
            <div className="flex gap-1">
              {[7, 14, 30].map((n) => (
                <button key={n} onClick={() => setRange(n)}
                  className={`px-2 py-1 rounded text-xs font-mono transition ${range === n ? "bg-dark text-bg-primary" : "text-text-tertiary hover:text-text-primary"}`}>
                  {n}d
                </button>
              ))}
            </div>
          </div>
          <ul className="space-y-1.5 mb-3">
            {(history ?? []).map((h) => (
              <li key={h.id} className="flex items-center gap-2 text-xs">
                <span className="w-16 text-text-tertiary font-mono">
                  {new Date(h.date + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </span>
                <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div className="h-full bg-terracota transition-all"
                    style={{ width: `${totalHist > 0 ? ((h.abordagem ?? 0) / Math.max(...(history ?? []).map((d) => d.abordagem ?? 0), 1)) * 100 : 0}%` }} />
                </div>
                <span className="font-mono w-8 text-right">{h.abordagem}</span>
              </li>
            ))}
            {(history ?? []).length === 0 && <li className="text-xs text-text-tertiary text-center py-4">Nenhum registro no período</li>}
          </ul>
          <div className="text-xs text-text-secondary">Total: <span className="font-mono text-text-primary">{totalHist}</span> abordagens</div>
        </div>
      </div>

      {openCfg && <CfgModal uid={uid} cfg={cfg} onClose={() => setOpenCfg(false)} onSaved={() => qc.invalidateQueries({ queryKey: ["ss_config"] })} />}
      {openRetro && <RetroModal uid={uid} onClose={() => setOpenRetro(false)} onSaved={() => {
        qc.invalidateQueries({ queryKey: ["ss_today"] });
        qc.invalidateQueries({ queryKey: ["ss_week"] });
        qc.invalidateQueries({ queryKey: ["ss_history"] });
      }} />}
    </div>
  );
}

function RetroModal({ uid, onClose, onSaved }: any) {
  const [date, setDate] = useState(todayISO());
  const [abord, setAbord] = useState(0);
  const [resp, setResp] = useState(0);
  const [reun, setReun] = useState(0);
  const [mode, setMode] = useState<"add" | "set">("add");

  const save = async () => {
    const { data: cur } = await supabase.from("ss_counts").select("*").eq("date", date).maybeSingle();
    const base = cur ?? { abordagem: 0, resposta: 0, reuniao: 0 };
    const payload = mode === "add"
      ? { abordagem: (base.abordagem ?? 0) + abord, resposta: (base.resposta ?? 0) + resp, reuniao: (base.reuniao ?? 0) + reun }
      : { abordagem: abord, resposta: resp, reuniao: reun };
    await supabase.from("ss_counts").upsert({ user_id: uid, date, ...payload }, { onConflict: "user_id,date" });
    toast.success("Salvo");
    onSaved(); onClose();
  };

  return (
    <Modal open onClose={onClose} title="Abordagens retroativas">
      <Field label="Data"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Modo">
        <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as any)}>
          <option value="add">Somar ao existente</option>
          <option value="set">Sobrescrever total</option>
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Abordagens"><input type="number" min={0} className={inputCls} value={abord} onChange={(e) => setAbord(+e.target.value)} /></Field>
        <Field label="Respostas"><input type="number" min={0} className={inputCls} value={resp} onChange={(e) => setResp(+e.target.value)} /></Field>
        <Field label="Reuniões"><input type="number" min={0} className={inputCls} value={reun} onChange={(e) => setReun(+e.target.value)} /></Field>
      </div>
      <div className="flex gap-2 justify-end mt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>Salvar</Btn></div>
    </Modal>
  );
}

function Stat({ label, value }: any) {
  return (
    <div className="bg-bg-secondary rounded-lg p-3">
      <div className="label-mono">{label}</div>
      <div className="font-display text-xl mt-1">{value}</div>
    </div>
  );
}

function CfgModal({ uid, cfg, onClose, onSaved }: any) {
  const [metaDay, setMetaDay] = useState(cfg?.meta_day ?? 10);
  const [metaWeek, setMetaWeek] = useState(cfg?.meta_week_reun ?? 3);
  const [taxa, setTaxa] = useState(cfg?.taxa ?? 20);
  const [ticket, setTicket] = useState(cfg?.ticket ?? 2000);

  const save = async () => {
    await supabase.from("ss_config").upsert({
      user_id: uid, meta_day: Number(metaDay), meta_week_reun: Number(metaWeek),
      taxa: Number(taxa), ticket: Number(ticket), updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    toast.success("Metas salvas");
    onSaved(); onClose();
  };

  return (
    <Modal open onClose={onClose} title="Configurar metas">
      <Field label="Abordagens por dia"><input type="number" className={inputCls} value={metaDay} onChange={(e) => setMetaDay(+e.target.value)} /></Field>
      <Field label="Reuniões por semana"><input type="number" className={inputCls} value={metaWeek} onChange={(e) => setMetaWeek(+e.target.value)} /></Field>
      <Field label="Taxa de conversão (%)"><input type="number" className={inputCls} value={taxa} onChange={(e) => setTaxa(+e.target.value)} /></Field>
      <Field label="Ticket médio (R$)"><input type="number" className={inputCls} value={ticket} onChange={(e) => setTicket(+e.target.value)} /></Field>
      <div className="flex gap-2 justify-end mt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>Salvar</Btn></div>
    </Modal>
  );
}

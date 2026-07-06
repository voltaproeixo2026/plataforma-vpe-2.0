import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, Btn, Modal, Field, inputCls, Tag, EmptyState } from "@/components/ui-custom";
import { TIME_CATEGORIES, fmtMins, getMonday, addDays, todayISO, monthRef, monthRange } from "@/lib/biz";
import { Play, Pause, Square, Pencil, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tempo")({
  head: () => ({ meta: [{ title: "Tempo — Painel" }] }),
  component: TimePage,
});

function TimePage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tActivity, setTActivity] = useState("");
  const [tCategory, setTCategory] = useState("conteudo");
  const startRef = useRef<number | null>(null);
  const baseRef = useRef<number>(0);
  const intervalRef = useRef<any>(null);

  const tick = () => {
    if (startRef.current != null) {
      const now = Date.now();
      setSecs(baseRef.current + Math.floor((now - startRef.current) / 1000));
    }
  };

  useEffect(() => {
    if (running) {
      startRef.current = Date.now();
      tick();
      intervalRef.current = setInterval(tick, 1000);
      const onVis = () => { if (document.visibilityState === "visible") tick(); };
      document.addEventListener("visibilitychange", onVis);
      return () => {
        clearInterval(intervalRef.current);
        document.removeEventListener("visibilitychange", onVis);
        if (startRef.current != null) {
          baseRef.current += Math.floor((Date.now() - startRef.current) / 1000);
          startRef.current = null;
          setSecs(baseRef.current);
        }
      };
    }
  }, [running]);

  const resetTimer = () => { baseRef.current = 0; startRef.current = null; setSecs(0); };

  const mref = monthRef();
  const monday = getMonday(new Date());

  const { data: logs = [] } = useQuery({
    queryKey: ["time_logs", uid],
    queryFn: async () => {
      const { data } = await supabase.from("time_logs").select("*").order("date", { ascending: false }).limit(40);
      return data ?? [];
    },
  });

  const { data: weekLogs = [] } = useQuery({
    queryKey: ["time_week", uid, monday.toISOString().slice(0, 10)],
    queryFn: async () => {
      const { data } = await supabase.from("time_logs").select("*")
        .gte("date", monday.toISOString().slice(0, 10))
        .lte("date", addDays(monday, 6).toISOString().slice(0, 10));
      return data ?? [];
    },
  });

  const { data: monthLogs = [] } = useQuery({
    queryKey: ["time_month", uid, mref],
    queryFn: async () => {
      const { start, end } = monthRange(mref);
      const { data } = await supabase.from("time_logs").select("*").gte("date", start).lte("date", end);
      return data ?? [];
    },
  });

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["time_logs"] });
    qc.invalidateQueries({ queryKey: ["time_week"] });
    qc.invalidateQueries({ queryKey: ["time_month"] });
  };

  const fmt = (n: number) => String(n).padStart(2, "0");
  const display = `${fmt(Math.floor(secs / 3600))}:${fmt(Math.floor((secs % 3600) / 60))}:${fmt(secs % 60)}`;

  const saveTimer = async () => {
    if (!tActivity.trim()) { toast.error("Adicione uma atividade"); return; }
    await supabase.from("time_logs").insert({
      user_id: uid, activity: tActivity, category: tCategory,
      date: todayISO(), minutes: Math.max(1, Math.ceil(secs / 60)),
    });
    toast.success("Tempo registrado");
    resetTimer(); setRunning(false); setSaving(false); setTActivity("");
    inv();
  };

  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const weekTotals = days.map((_, i) => {
    const iso = addDays(monday, i).toISOString().slice(0, 10);
    return weekLogs.filter((l: any) => l.date === iso).reduce((a: number, b: any) => a + b.minutes, 0);
  });
  const todayIdx = (new Date().getDay() + 6) % 7;
  const maxW = Math.max(...weekTotals, 1);

  const monthByCat = TIME_CATEGORIES.map((c) => ({
    ...c,
    mins: monthLogs.filter((l: any) => l.category === c.key).reduce((a: number, b: any) => a + b.minutes, 0),
  })).filter((c) => c.mins > 0);
  const monthTotal = monthByCat.reduce((a, b) => a + b.mins, 0);

  const remove = async (id: string) => { await supabase.from("time_logs").delete().eq("id", id); inv(); };

  return (
    <div>
      <PageHeader title="Registro de Tempo">
        <Btn onClick={() => { setEditing(null); setOpen(true); }}>+ Registrar</Btn>
      </PageHeader>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-bg-primary border border-border rounded-xl p-6 text-center">
          <div className="label-mono mb-3">Cronômetro</div>
          <div className="font-display text-6xl text-terracota tabular-nums mb-5">{display}</div>
          <div className="flex justify-center gap-2">
            {!running && !saving && <Btn onClick={() => setRunning(true)}><Play size={14} className="inline mr-1" />Iniciar</Btn>}
            {running && (
              <>
                <Btn variant="ghost" onClick={() => setRunning(false)}><Pause size={14} className="inline mr-1" />Pausar</Btn>
                <Btn variant="dark" onClick={() => { setRunning(false); setSaving(true); }}><Square size={14} className="inline mr-1" />Salvar</Btn>
              </>
            )}
            {!running && saving && <Btn variant="ghost" onClick={() => { resetTimer(); setSaving(false); }}>Cancelar</Btn>}
          </div>
          {saving && (
            <div className="mt-4 space-y-2 text-left">
              <Field label="Atividade *"><input className={inputCls} value={tActivity} onChange={(e) => setTActivity(e.target.value)} autoFocus /></Field>
              <Field label="Categoria">
                <select className={inputCls} value={tCategory} onChange={(e) => setTCategory(e.target.value)}>
                  {TIME_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </Field>
              <Btn onClick={saveTimer}>Salvar registro</Btn>
            </div>
          )}
        </div>

        <div className="bg-bg-primary border border-border rounded-xl p-5">
          <div className="label-mono mb-3">Esta semana</div>
          <div className="flex items-end gap-2 h-32 mb-4">
            {weekTotals.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] font-mono text-text-tertiary">{m > 0 ? `${Math.round((m / 60) * 10) / 10}h` : ""}</div>
                <div className="w-full rounded-t transition-all" style={{
                  height: `${(m / maxW) * 100}%`,
                  background: i === todayIdx ? "var(--terracota)" : "var(--sage)",
                  minHeight: m > 0 ? 4 : 0,
                }} />
                <div className="text-[10px] font-mono" style={{ color: i === todayIdx ? "var(--terracota)" : "var(--text-tertiary)" }}>{days[i]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-bg-primary border border-border rounded-xl p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="label-mono">Distribuição do mês</div>
          <div className="font-mono text-sm text-text-secondary">{fmtMins(monthTotal)}</div>
        </div>
        {monthByCat.length > 0 ? (
          <div className="space-y-3">
            {monthByCat.map((c) => {
              const perc = monthTotal > 0 ? Math.round((c.mins / monthTotal) * 100) : 0;
              return (
                <div key={c.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: c.color }} />{c.label}</span>
                    <span className="font-mono text-text-secondary">{fmtMins(c.mins)} · {perc}%</span>
                  </div>
                  <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${perc}%`, background: c.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : <div className="text-xs text-text-tertiary text-center py-8">Registre tempo para ver a distribuição.</div>}
      </div>

      <div className="bg-bg-primary border border-border rounded-xl p-5">
        <div className="label-mono mb-3">Registros recentes</div>
        {logs.length === 0 ? <EmptyState icon="⏱" text="Nenhum registro" /> : (
          <ul className="divide-y divide-border">
            {logs.map((l: any) => {
              const cat = TIME_CATEGORIES.find((c) => c.key === l.category);
              return (
                <li key={l.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat?.color }} />
                  <span className="font-mono text-xs text-text-tertiary w-20">{new Date(l.date + "T12:00").toLocaleDateString("pt-BR")}</span>
                  <span className="flex-1 truncate">{l.activity}</span>
                  <Tag color="neutral">{cat?.label}</Tag>
                  <span className="font-mono text-xs w-16 text-right">{fmtMins(l.minutes)}</span>
                  <button onClick={() => { setEditing(l); setOpen(true); }} className="text-text-tertiary hover:text-terracota"><Pencil size={14} /></button>
                  <button onClick={() => remove(l.id)} className="text-text-tertiary hover:text-[#e05c5c]"><X size={14} /></button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {open && <LogModal uid={uid} editing={editing} onClose={() => setOpen(false)} onSaved={inv} />}
    </div>
  );
}

function LogModal({ uid, editing, onClose, onSaved }: any) {
  const e = editing ?? {};
  const [activity, setActivity] = useState(e.activity ?? "");
  const [category, setCategory] = useState(e.category ?? "conteudo");
  const [date, setDate] = useState(e.date ?? todayISO());
  const [hours, setHours] = useState(e.minutes ? Math.floor(e.minutes / 60) : 0);
  const [minutes, setMinutes] = useState(e.minutes ? e.minutes % 60 : 0);
  const [notes, setNotes] = useState(e.notes ?? "");

  const save = async () => {
    if (!activity.trim()) { toast.error("Informe a atividade"); return; }
    const total = hours * 60 + minutes;
    if (total <= 0) { toast.error("Tempo inválido"); return; }
    const payload = { activity, category, date, minutes: total, notes };
    if (editing?.id) await supabase.from("time_logs").update(payload).eq("id", editing.id);
    else await supabase.from("time_logs").insert({ ...payload, user_id: uid });
    toast.success("Salvo"); onSaved(); onClose();
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Editar tempo" : "Registrar tempo"} wide>
      <Field label="Atividade *"><input className={inputCls} value={activity} onChange={(e) => setActivity(e.target.value)} autoFocus /></Field>
      <div className="grid md:grid-cols-2 gap-x-4">
        <Field label="Categoria">
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {TIME_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Data"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Horas"><input type="number" min={0} max={24} className={inputCls} value={hours} onChange={(e) => setHours(+e.target.value)} /></Field>
        <Field label="Minutos"><input type="number" min={0} max={59} className={inputCls} value={minutes} onChange={(e) => setMinutes(+e.target.value)} /></Field>
      </div>
      <Field label="Notas"><textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <div className="flex gap-2 justify-end mt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>Salvar</Btn></div>
    </Modal>
  );
}

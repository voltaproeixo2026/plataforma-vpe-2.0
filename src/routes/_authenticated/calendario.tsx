import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, Btn, Modal, Field, inputCls } from "@/components/ui-custom";
import { EVENT_TYPES } from "@/lib/biz";
import { X, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendário — Painel" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(new Date());
  const [modal, setModal] = useState<{ date?: string; editing?: any } | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthRef = `${year}-${String(month + 1).padStart(2, "0")}`;

  const { data: events = [] } = useQuery({
    queryKey: ["events", uid, monthRef],
    queryFn: async () => {
      const start = `${monthRef}-01`;
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      const { data } = await supabase.from("calendar_events").select("*").gte("date", start).lte("date", end).order("date");
      return data ?? [];
    },
  });

  const upcoming = useQuery({
    queryKey: ["events-upcoming", uid],
    queryFn: async () => {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const { data } = await supabase.from("calendar_events").select("*").gte("date", today).order("date").limit(50);
      return data ?? [];
    },
  });

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: { date: Date; outside: boolean }[] = [];
    for (let i = startOffset; i > 0; i--) arr.push({ date: new Date(year, month, 1 - i), outside: true });
    for (let i = 1; i <= daysInMonth; i++) arr.push({ date: new Date(year, month, i), outside: false });
    while (arr.length % 7 !== 0) arr.push({ date: new Date(year, month, arr.length - startOffset - daysInMonth + 1), outside: true });
    return arr;
  }, [year, month]);

  const todayISO = new Date().toISOString().slice(0, 10);
  const remove = async (id: string) => {
    await supabase.from("calendar_events").delete().eq("id", id);
    toast.success("Removido");
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["events-upcoming"] });
  };

  return (
    <div>
      <PageHeader title={cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}>
        <Btn variant="ghost" onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</Btn>
        <Btn variant="ghost" onClick={() => setCursor(new Date())}>Hoje</Btn>
        <Btn variant="ghost" onClick={() => setCursor(new Date(year, month + 1, 1))}>›</Btn>
        <Btn onClick={() => setModal({})}>+ Evento</Btn>
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-bg-primary border border-border rounded-xl p-4">
          <div className="grid grid-cols-7 gap-1 mb-2 text-center label-mono">
            {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map(({ date, outside }, i) => {
              const iso = date.toISOString().slice(0, 10);
              const evs = events.filter((e: any) => e.date === iso);
              const isToday = iso === todayISO;
              return (
                <button key={i} onClick={() => setModal({ date: iso })}
                  className={`aspect-square text-left p-1.5 rounded-lg text-xs border transition ${outside ? "opacity-30" : ""} ${isToday ? "border-terracota" : "border-border"} hover:bg-bg-secondary`}>
                  <div className="font-mono">{date.getDate()}</div>
                  <div className="mt-1 space-y-0.5">
                    {evs.slice(0, 2).map((e: any) => {
                      const type = EVENT_TYPES.find(t => t.key === e.type);
                      return <div key={e.id} onClick={(ev) => { ev.stopPropagation(); setModal({ editing: e }); }} className="truncate text-[10px] px-1 rounded cursor-pointer" style={{ background: type?.color, color: "#FDFAF5" }}>{e.title}</div>;
                    })}
                    {evs.length > 2 && <div className="text-[9px] text-text-tertiary">+{evs.length - 2}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <div className="label-mono mb-3">Próximos eventos</div>
          {(upcoming.data ?? []).length === 0 ? <div className="text-text-tertiary text-sm">Sem eventos</div> : (
            <ul className="space-y-2">
              {(upcoming.data ?? []).map((e: any) => {
                const type = EVENT_TYPES.find(t => t.key === e.type);
                return (
                  <li key={e.id} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full" style={{ background: type?.color }} />
                    <span className="font-mono text-xs text-text-tertiary w-20">{new Date(e.date + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                    <span className="flex-1 cursor-pointer hover:underline" onClick={() => setModal({ editing: e })}>{e.title}</span>
                    <button onClick={() => setModal({ editing: e })} className="text-text-tertiary hover:text-terracota"><Pencil size={13} /></button>
                    <button onClick={() => remove(e.id)} className="text-text-tertiary hover:text-text-primary"><X size={14} /></button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {modal && <EventModal uid={uid} initialDate={modal.date} editing={modal.editing} onClose={() => setModal(null)} onDeleted={(id: string) => { remove(id); setModal(null); }} onSaved={() => { qc.invalidateQueries({ queryKey: ["events"] }); qc.invalidateQueries({ queryKey: ["events-upcoming"] }); }} />}
    </div>
  );
}

function EventModal({ uid, initialDate, editing, onClose, onSaved, onDeleted }: any) {
  const e = editing ?? {};
  const [title, setTitle] = useState(e.title ?? "");
  const [date, setDate] = useState(e.date ?? initialDate ?? new Date().toISOString().slice(0, 10));
  const [type, setType] = useState(e.type ?? "tc");
  const [notes, setNotes] = useState(e.notes ?? "");

  const save = async () => {
    if (!title.trim()) return;
    if (editing?.id) {
      await supabase.from("calendar_events").update({ title, date, type, notes }).eq("id", editing.id);
      toast.success("Atualizado");
    } else {
      await supabase.from("calendar_events").insert({ user_id: uid, title, date, type, notes });
      toast.success("Criado");
    }
    onSaved(); onClose();
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Editar evento" : "Novo evento"}>
      <Field label="Título *"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
      <Field label="Data"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Tipo">
        <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
          {EVENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </Field>
      <Field label="Notas"><textarea className={inputCls} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <div className="flex gap-2 justify-between items-center mt-4">
        <div>
          {editing?.id && (
            <Btn variant="ghost" onClick={() => { if (confirm("Apagar?")) onDeleted(editing.id); }}>
              <span className="text-[#e05c5c]">Apagar</span>
            </Btn>
          )}
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={save}>Salvar</Btn>
        </div>
      </div>
    </Modal>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, ProgressBar, Btn, Modal, Field, inputCls, Tag, EmptyState, Chip } from "@/components/ui-custom";
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_EXECUTION, todayISO } from "@/lib/biz";
import { Circle, CheckCircle2, X, Pencil, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Painel" }] }),
  component: TasksPage,
});

function TasksPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [execFilter, setExecFilter] = useState<string>("todos");

  const date = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + offset);
    return d;
  }, [offset]);
  const dateISO = date.toISOString().slice(0, 10);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", uid, dateISO],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").eq("date", dateISO).order("created_at");
      return data ?? [];
    },
  });

  const { data: overdue = [] } = useQuery({
    queryKey: ["tasks_overdue", uid, todayISO()],
    enabled: offset === 0,
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").lt("date", todayISO()).eq("done", false).order("date", { ascending: false });
      return data ?? [];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["tasks_overdue"] });
  };

  const toggle = async (t: any) => { await supabase.from("tasks").update({ done: !t.done }).eq("id", t.id); invalidate(); };
  const remove = async (id: string) => { await supabase.from("tasks").delete().eq("id", id); toast.success("Removida"); invalidate(); };
  const moveToToday = async (id: string) => { await supabase.from("tasks").update({ date: todayISO() }).eq("id", id); toast.success("Movida"); invalidate(); };

  const passesExec = (t: any) => execFilter === "todos" || (t.execution_status ?? "fazer") === execFilter;
  const filtered = tasks.filter(passesExec);
  const pending = filtered.filter((t: any) => !t.done);
  const done = filtered.filter((t: any) => t.done);
  const byP = (p: string) => pending.filter((t: any) => t.priority === p);

  const dateLabel = offset === 0 ? "Hoje" : offset === -1 ? "Ontem" : offset === 1 ? "Amanhã" : date.toLocaleDateString("pt-BR");

  return (
    <div>
      <PageHeader title="Tarefas" subtitle={date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}>
        <Btn variant="ghost" onClick={() => setOffset(offset - 1)}>‹ Ontem</Btn>
        <Btn variant={offset === 0 ? "primary" : "ghost"} onClick={() => setOffset(0)}>{dateLabel}</Btn>
        <Btn variant="ghost" onClick={() => setOffset(offset + 1)}>Amanhã ›</Btn>
        <Btn onClick={() => { setEditing(null); setOpen(true); }}>+ Nova</Btn>
      </PageHeader>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <span className="label-mono self-center mr-1">Execução:</span>
        <Chip active={execFilter === "todos"} onClick={() => setExecFilter("todos")}>Todas</Chip>
        {TASK_EXECUTION.map(e => (
          <Chip key={e.key} active={execFilter === e.key} onClick={() => setExecFilter(e.key)}>{e.label}</Chip>
        ))}
      </div>

      {offset === 0 && overdue.length > 0 && (
        <div className="bg-bg-primary border border-[#e05c5c]/40 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-2 text-[#e05c5c] label-mono">
            <AlertTriangle size={14} /> Pendentes anteriores ({overdue.length})
          </div>
          <ul className="space-y-1.5">
            {overdue.map((t: any) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <button onClick={() => toggle(t)} className="text-text-tertiary hover:text-sage"><Circle size={16} /></button>
                <span className="font-mono text-[10px] text-text-tertiary w-14">{new Date(t.date + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                <span className="flex-1">{t.text}</span>
                <Tag color="neutral">{t.category}</Tag>
                <button onClick={() => moveToToday(t.id)} className="text-xs text-terracota font-mono hover:underline">→ hoje</button>
                <button onClick={() => { setEditing(t); setOpen(true); }} className="text-text-tertiary hover:text-terracota"><Pencil size={14} /></button>
                <button onClick={() => remove(t.id)} className="text-text-tertiary hover:text-[#e05c5c]"><X size={14} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {[
            { p: "alta", label: "🔴 Alta", border: "#e05c5c" },
            { p: "media", label: "🟡 Média", border: "var(--gold)" },
            { p: "baixa", label: "🟢 Baixa", border: "var(--sage)" },
          ].map((g) => (
            <div key={g.p}>
              <div className="label-mono mb-2">{g.label}</div>
              {byP(g.p).length === 0 ? (
                <div className="text-xs text-text-tertiary px-3 py-2">—</div>
              ) : (
                <ul className="space-y-2">
                  {byP(g.p).map((t: any) => {
                    const ex = TASK_EXECUTION.find(e => e.key === (t.execution_status ?? "fazer"));
                    return (
                      <li key={t.id} className="bg-bg-primary border border-border rounded-lg p-3 flex items-center gap-3" style={{ borderLeft: `3px solid ${g.border}` }}>
                        <button onClick={() => toggle(t)} className="text-text-tertiary hover:text-sage"><Circle size={18} /></button>
                        <span className="flex-1 text-sm">{t.text}</span>
                        {ex && <Tag color="blue">{ex.label}</Tag>}
                        <Tag color="neutral">{t.category}</Tag>
                        <button onClick={() => { setEditing(t); setOpen(true); }} className="text-text-tertiary hover:text-terracota"><Pencil size={14} /></button>
                        <button onClick={() => remove(t.id)} className="text-text-tertiary hover:text-text-primary"><X size={16} /></button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <div className="label-mono mb-2">Progresso</div>
            <div className="font-display text-3xl mb-3">{done.length} / {filtered.length}</div>
            <ProgressBar value={done.length} max={filtered.length || 1} color="var(--sage)" />
          </div>
          <div className="bg-bg-primary border border-border rounded-xl p-5">
            <div className="label-mono mb-3">Concluídas</div>
            {done.length === 0 ? <EmptyState icon="✨" text="Nada concluído ainda" /> : (
              <ul className="space-y-1.5">
                {done.map((t: any) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    <button onClick={() => toggle(t)} className="text-sage"><CheckCircle2 size={16} /></button>
                    <span className="flex-1 line-through text-text-tertiary">{t.text}</span>
                    <button onClick={() => { setEditing(t); setOpen(true); }} className="text-text-tertiary hover:text-terracota"><Pencil size={14} /></button>
                    <button onClick={() => remove(t.id)} className="text-text-tertiary hover:text-text-primary"><X size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {open && <TaskModal uid={uid} dateISO={dateISO} editing={editing} onClose={() => setOpen(false)} onSaved={invalidate} />}
    </div>
  );
}

function TaskModal({ uid, dateISO, editing, onClose, onSaved }: any) {
  const e = editing ?? {};
  const [text, setText] = useState(e.text ?? "");
  const [priority, setPriority] = useState(e.priority ?? "media");
  const [category, setCategory] = useState(e.category ?? "outro");
  const [executionStatus, setExecutionStatus] = useState(e.execution_status ?? "fazer");
  const [notes, setNotes] = useState(e.notes ?? "");
  const [date, setDate] = useState(e.date ?? dateISO);

  const save = async () => {
    if (!text.trim()) return;
    const payload = { text, priority, category, execution_status: executionStatus, notes, date };
    if (editing?.id) await supabase.from("tasks").update(payload).eq("id", editing.id);
    else await supabase.from("tasks").insert({ ...payload, user_id: uid });
    toast.success(editing ? "Atualizada" : "Criada");
    onSaved(); onClose();
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Editar tarefa" : "Nova tarefa"}>
      <Field label="Tarefa *"><input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} autoFocus /></Field>
      <Field label="Data *"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Execução">
        <select className={inputCls} value={executionStatus} onChange={(e) => setExecutionStatus(e.target.value)}>
          {TASK_EXECUTION.map(ex => <option key={ex.key} value={ex.key}>{ex.label}</option>)}
        </select>
      </Field>
      <Field label="Prioridade">
        <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value)}>
          {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>
      <Field label="Categoria">
        <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
          {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Notas"><textarea className={inputCls} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <div className="flex gap-2 justify-end mt-4">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={save}>Salvar</Btn>
      </div>
    </Modal>
  );
}

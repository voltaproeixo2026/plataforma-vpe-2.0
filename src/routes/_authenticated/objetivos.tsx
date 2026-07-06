import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, Btn, Modal, Field, inputCls, Tag, ProgressBar } from "@/components/ui-custom";
import { OBJ_CATEGORIES, monthRef } from "@/lib/biz";
import { Circle, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/objetivos")({
  head: () => ({ meta: [{ title: "Objetivos — Painel" }] }),
  component: ObjPage,
});

function ObjPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(new Date());
  const mref = monthRef(cursor);
  const [open, setOpen] = useState(false);
  const [intInput, setIntInput] = useState("");

  const { data: objs = [] } = useQuery({
    queryKey: ["objectives", uid, mref],
    queryFn: async () => {
      const { data } = await supabase.from("objectives").select("*").eq("month_ref", mref).order("created_at");
      return data ?? [];
    },
  });
  const { data: ints = [] } = useQuery({
    queryKey: ["intentions", uid, mref],
    queryFn: async () => {
      const { data } = await supabase.from("intentions").select("*").eq("month_ref", mref).order("created_at");
      return data ?? [];
    },
  });

  const invObj = () => qc.invalidateQueries({ queryKey: ["objectives"] });
  const invInt = () => qc.invalidateQueries({ queryKey: ["intentions"] });

  const toggle = async (o: any) => { await supabase.from("objectives").update({ done: !o.done }).eq("id", o.id); invObj(); };
  const removeObj = async (id: string) => { await supabase.from("objectives").delete().eq("id", id); invObj(); };
  const addInt = async (text: string) => { await supabase.from("intentions").insert({ user_id: uid, text, month_ref: mref }); invInt(); };
  const removeInt = async (id: string) => { await supabase.from("intentions").delete().eq("id", id); invInt(); };

  const done = objs.filter((o: any) => o.done).length;

  return (
    <div>
      <PageHeader title="Objetivos" subtitle={cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}>
        <Btn variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</Btn>
        <Btn variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</Btn>
        <Btn onClick={() => setOpen(true)}>+ Objetivo</Btn>
      </PageHeader>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-dark text-bg-primary rounded-2xl p-6">
          <div className="label-mono text-bg-tertiary/70 mb-3">Objetivos</div>
          {objs.length === 0 ? <div className="text-bg-tertiary/60 text-sm">Sem objetivos para este mês</div> : (
            <ul className="space-y-2">
              {objs.map((o: any) => (
                <li key={o.id} className={`flex items-start gap-3 ${o.done ? "opacity-50" : ""}`}>
                  <button onClick={() => toggle(o)} className="mt-0.5">{o.done ? <CheckCircle2 size={18} className="text-sage" /> : <Circle size={18} />}</button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${o.done ? "line-through" : ""}`}>{o.text}</div>
                    <div className="text-[10px] font-mono text-bg-tertiary/60 mt-0.5">
                      criado {new Date(o.created_at).toLocaleDateString("pt-BR")}
                      {o.due_date && <> · prazo {new Date(o.due_date + "T12:00").toLocaleDateString("pt-BR")}</>}
                    </div>
                  </div>
                  <Tag color="terracota">{o.category}</Tag>
                  <button onClick={() => removeObj(o.id)} className="text-bg-tertiary/60 hover:text-bg-primary"><X size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-bg-primary border border-border rounded-xl p-5">
            <div className="label-mono mb-2">Progresso</div>
            <div className="font-display text-3xl mb-3">{done} / {objs.length}</div>
            <ProgressBar value={done} max={objs.length || 1} color="var(--sage)" />
          </div>
          <div className="bg-dark text-bg-primary rounded-2xl p-5">
            <div className="label-mono text-bg-tertiary/70 mb-3">Intenção do mês</div>
            <div className="flex gap-2 mb-3">
              <input className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-bg-primary" placeholder="Nova intenção..." value={intInput} onChange={(e) => setIntInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && intInput.trim()) { addInt(intInput.trim()); setIntInput(""); } }} />
              <button onClick={() => { if (intInput.trim()) { addInt(intInput.trim()); setIntInput(""); } }} className="px-3 rounded-lg bg-terracota">+</button>
            </div>
            <ul className="space-y-1.5">
              {ints.map((i: any) => (
                <li key={i.id} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-terracota" />
                  <span className="flex-1">{i.text}</span>
                  <button onClick={() => removeInt(i.id)} className="text-bg-tertiary/60 hover:text-bg-primary"><X size={14} /></button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {open && <ObjModal uid={uid} mref={mref} onClose={() => setOpen(false)} onSaved={invObj} />}
    </div>
  );
}

function ObjModal({ uid, mref, onClose, onSaved }: any) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("outro");
  const [due, setDue] = useState("");
  const save = async () => {
    if (!text.trim()) return;
    await supabase.from("objectives").insert({ user_id: uid, text, category, month_ref: mref, due_date: due || null });
    toast.success("Salvo"); onSaved(); onClose();
  };
  return (
    <Modal open onClose={onClose} title="Novo objetivo">
      <Field label="Objetivo *"><input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} autoFocus /></Field>
      <Field label="Categoria"><select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>{OBJ_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Prazo"><input type="date" className={inputCls} value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      <div className="flex gap-2 justify-end mt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>Salvar</Btn></div>
    </Modal>
  );
}

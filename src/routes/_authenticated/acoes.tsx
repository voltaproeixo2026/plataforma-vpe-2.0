import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, Btn, Modal, Field, inputCls, Tag, EmptyState } from "@/components/ui-custom";
import { ACTION_TYPES, fmtBRL } from "@/lib/biz";
import { X, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/acoes")({
  head: () => ({ meta: [{ title: "Ações — Painel" }] }),
  component: ActionsPage,
});

function ActionsPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: actions = [] } = useQuery({
    queryKey: ["actions", uid],
    queryFn: async () => {
      const { data } = await supabase.from("actions").select("*").order("date", { ascending: false, nullsFirst: false });
      return data ?? [];
    },
  });

  const inv = () => qc.invalidateQueries({ queryKey: ["actions"] });
  const remove = async (id: string) => { await supabase.from("actions").delete().eq("id", id); toast.success("Removido"); inv(); };

  return (
    <div>
      <PageHeader title="Ações" subtitle="Lançamentos, campanhas, eventos">
        <Btn onClick={() => { setEditing(null); setOpen(true); }}>+ Nova ação</Btn>
      </PageHeader>

      {actions.length === 0 ? <EmptyState icon="🚀" text="Nenhuma ação registrada" /> : (
        <div className="space-y-4">
          {actions.map((a: any) => (
            <div key={a.id} className="bg-bg-primary border border-border rounded-xl p-5 relative">
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => { setEditing(a); setOpen(true); }} className="text-text-tertiary hover:text-terracota"><Pencil size={14} /></button>
                <button onClick={() => remove(a.id)} className="text-text-tertiary hover:text-[#e05c5c]"><X size={16} /></button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-display text-2xl">{a.name}</h3>
                <Tag color="terracota">{a.type}</Tag>
                {a.date && <span className="text-xs text-text-tertiary font-mono">{new Date(a.date + "T12:00").toLocaleDateString("pt-BR")}</span>}
              </div>
              <div className="flex flex-wrap gap-6 mb-4 text-sm">
                <div>💰 <span className="font-mono">{fmtBRL(Number(a.revenue ?? 0))}</span></div>
                <div>👁 <span className="font-mono">{a.people_reached ?? 0} alcançadas</span></div>
                <div>✅ <span className="font-mono">{a.people_closed ?? 0} fechadas</span></div>
              </div>
              <div className="grid md:grid-cols-2 gap-3 mb-3">
                <Section label="O que deu certo" text={a.what_worked} color="var(--sage)" />
                <Section label="Pode melhorar" text={a.what_to_improve} color="var(--gold)" />
              </div>
              <Section label="Próximas oportunidades" text={a.next_opportunities} color="var(--terracota)" />
            </div>
          ))}
        </div>
      )}

      {open && <ActionModal uid={uid} editing={editing} onClose={() => setOpen(false)} onSaved={inv} />}
    </div>
  );
}

function Section({ label, text, color }: any) {
  return (
    <div className="bg-bg-secondary rounded-lg p-3 border-l-4" style={{ borderColor: color }}>
      <div className="label-mono mb-1">{label}</div>
      <div className="text-sm whitespace-pre-wrap">{text || <span className="text-text-tertiary">—</span>}</div>
    </div>
  );
}

function ActionModal({ uid, editing, onClose, onSaved }: any) {
  const e = editing ?? {};
  const [name, setName] = useState(e.name ?? "");
  const [type, setType] = useState(e.type ?? "Lançamento");
  const [date, setDate] = useState(e.date ?? "");
  const [revenue, setRevenue] = useState(e.revenue ?? "");
  const [reached, setReached] = useState(e.people_reached ?? "");
  const [closed, setClosed] = useState(e.people_closed ?? "");
  const [worked, setWorked] = useState(e.what_worked ?? "");
  const [improve, setImprove] = useState(e.what_to_improve ?? "");
  const [next, setNext] = useState(e.next_opportunities ?? "");
  const save = async () => {
    if (!name.trim()) return;
    const payload = { name, type, date: date || null, revenue: Number(revenue || 0), people_reached: Number(reached || 0), people_closed: Number(closed || 0), what_worked: worked, what_to_improve: improve, next_opportunities: next };
    if (editing?.id) await supabase.from("actions").update(payload).eq("id", editing.id);
    else await supabase.from("actions").insert({ ...payload, user_id: uid });
    toast.success(editing ? "Atualizado" : "Salvo"); onSaved(); onClose();
  };
  return (
    <Modal open onClose={onClose} title={editing ? "Editar ação" : "Nova ação"} wide>
      <div className="grid md:grid-cols-2 gap-x-4">
        <Field label="Nome *"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Tipo"><select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>{ACTION_TYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Data"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Faturamento (R$)"><input type="number" className={inputCls} value={revenue} onChange={(e) => setRevenue(e.target.value)} /></Field>
        <Field label="Pessoas alcançadas"><input type="number" className={inputCls} value={reached} onChange={(e) => setReached(e.target.value)} /></Field>
        <Field label="Pessoas fechadas"><input type="number" className={inputCls} value={closed} onChange={(e) => setClosed(e.target.value)} /></Field>
      </div>
      <Field label="O que deu certo"><textarea className={inputCls} rows={2} value={worked} onChange={(e) => setWorked(e.target.value)} /></Field>
      <Field label="Pode melhorar"><textarea className={inputCls} rows={2} value={improve} onChange={(e) => setImprove(e.target.value)} /></Field>
      <Field label="Próximas oportunidades"><textarea className={inputCls} rows={2} value={next} onChange={(e) => setNext(e.target.value)} /></Field>
      <div className="flex gap-2 justify-end mt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>Salvar</Btn></div>
    </Modal>
  );
}

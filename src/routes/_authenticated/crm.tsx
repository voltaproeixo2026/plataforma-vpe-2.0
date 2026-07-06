import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, Btn, Modal, Field, inputCls, Tag, ToggleList, EmptyState, Chip } from "@/components/ui-custom";
import { CONTACT_STATUSES, TEMPERATURAS, ORIGENS, PROSPECCAO_OPTIONS, todayISO } from "@/lib/biz";
import { Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({ meta: [{ title: "CRM — Painel" }] }),
  component: CRMPage,
});

function CRMPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [view, setView] = useState<string>("todos");
  const [tempFilter, setTempFilter] = useState<string>("todos");
  const [prosp, setProsp] = useState<string>("todos");
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", uid],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = useMemo(() => contacts.filter((c: any) => {
    const matchQ = !q || c.name?.toLowerCase().includes(q.toLowerCase()) || c.instagram?.toLowerCase().includes(q.toLowerCase());
    const matchView = view === "todos" || (view === "follow-up" ? !!c.follow_up_date : c.status === view);
    const matchT = tempFilter === "todos" || c.temperatura === tempFilter;
    const matchP = prosp === "todos" || c.prospeccao === prosp;
    return matchQ && matchView && matchT && matchP;
  }), [contacts, q, view, tempFilter, prosp]);

  const remove = async (id: string) => {
    await supabase.from("contacts").delete().eq("id", id);
    toast.success("Removido");
    qc.invalidateQueries({ queryKey: ["contacts"] });
  };

  const prospOptions = useMemo(() => {
    const fromData = Array.from(new Set(contacts.map((c: any) => c.prospeccao).filter(Boolean)));
    return Array.from(new Set([...PROSPECCAO_OPTIONS, ...fromData])) as string[];
  }, [contacts]);

  return (
    <div>
      <PageHeader title="CRM" subtitle={`${contacts.length} contatos`}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input className={`${inputCls} pl-8 w-56`} placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Btn onClick={() => { setEditing(null); setOpen(true); }}>+ Novo</Btn>
      </PageHeader>

      <div className="space-y-2 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 items-center">
          <span className="label-mono mr-1">Status:</span>
          <Chip active={view === "todos"} onClick={() => setView("todos")}>Todos</Chip>
          {CONTACT_STATUSES.map(s => <Chip key={s.key} active={view === s.key} onClick={() => setView(s.key)}>{s.label}</Chip>)}
          <Chip active={view === "follow-up"} onClick={() => setView("follow-up")}>🔄 Follow-up</Chip>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 items-center">
          <span className="label-mono mr-1">Temperatura:</span>
          <Chip active={tempFilter === "todos"} onClick={() => setTempFilter("todos")}>Todas</Chip>
          {TEMPERATURAS.map(t => <Chip key={t.key} active={tempFilter === t.key} onClick={() => setTempFilter(t.key)}>{t.label}</Chip>)}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 items-center">
          <span className="label-mono mr-1">Prospecção:</span>
          <Chip active={prosp === "todos"} onClick={() => setProsp("todos")}>Todas</Chip>
          {prospOptions.map(p => <Chip key={p} active={prosp === p} onClick={() => setProsp(p)}>{p}</Chip>)}
        </div>
      </div>

      {filtered.length === 0 ? <EmptyState icon="👥" text="Nenhum contato" /> : (
        <ul className="space-y-2">
          {filtered.map((c: any) => {
            const st = CONTACT_STATUSES.find(s => s.key === c.status);
            const temp = TEMPERATURAS.find(t => t.key === c.temperatura);
            return (
              <li key={c.id} className="bg-bg-primary border border-border rounded-lg p-3 flex flex-wrap items-center gap-3 hover:bg-bg-secondary/50">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-text-tertiary truncate">
                    {c.next_action ? <span>→ {c.next_action}</span> : <span className="italic">sem próxima ação</span>}
                    {c.follow_up_date && <span className="ml-2">· 🔄 {new Date(c.follow_up_date + "T12:00").toLocaleDateString("pt-BR")}</span>}
                  </div>
                </div>
                {temp && <Tag color={temp.color}>{temp.label}</Tag>}
                {st && <Tag color={st.color}>{st.label}</Tag>}
                {c.prospeccao && <Tag color="blue">{c.prospeccao}</Tag>}
                {c.origem && <Tag color="neutral">{c.origem}</Tag>}
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(c); setOpen(true); }} className="text-text-tertiary hover:text-terracota"><Pencil size={14} /></button>
                  <button onClick={() => remove(c.id)} className="text-text-tertiary hover:text-[#e05c5c]"><Trash2 size={14} /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open && <ContactModal uid={uid} editing={editing} prospOptions={prospOptions} onClose={() => setOpen(false)} onSaved={() => qc.invalidateQueries({ queryKey: ["contacts"] })} />}
    </div>
  );
}

function ContactModal({ uid, editing, prospOptions, onClose, onSaved }: any) {
  const e = editing ?? {};
  const [name, setName] = useState(e.name ?? "");
  const [instagram, setInstagram] = useState(e.instagram ?? "");
  const [whatsapp, setWhatsapp] = useState(e.whatsapp ?? "");
  const [email, setEmail] = useState(e.email ?? "");
  const [temperatura, setTemperatura] = useState(e.temperatura ?? "morno");
  const [status, setStatus] = useState(e.status ?? "acompanhando");
  const [origem, setOrigem] = useState(e.origem ?? "");
  const [prospeccao, setProspeccao] = useState(e.prospeccao ?? "");
  const [prospCustom, setProspCustom] = useState("");
  const [acionadoEm, setAcionadoEm] = useState(e.acionado_em ?? todayISO());
  const [nextAction, setNextAction] = useState(e.next_action ?? "");
  const [followUpDate, setFollowUpDate] = useState(e.follow_up_date ?? "");
  const [followUpObj, setFollowUpObj] = useState(e.follow_up_objective ?? "");
  const [notes, setNotes] = useState(e.notes ?? "");
  const [comum, setComum] = useState<string[]>(e.comum ?? []);

  const finalProsp = prospeccao === "__custom" ? prospCustom.trim() : prospeccao;

  const save = async () => {
    if (!name.trim()) return;
    const payload: any = {
      name, instagram, whatsapp, email, temperatura, status, origem,
      prospeccao: finalProsp || null, acionado_em: acionadoEm || null,
      next_action: nextAction, follow_up_date: followUpDate || null,
      follow_up_objective: followUpObj || null, notes, comum,
    };
    if (editing?.id) await supabase.from("contacts").update(payload).eq("id", editing.id);
    else await supabase.from("contacts").insert({ ...payload, user_id: uid });
    toast.success("Salvo");
    onSaved(); onClose();
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Editar contato" : "Novo contato"} wide>
      <div className="grid md:grid-cols-2 gap-x-4">
        <Field label="Nome *"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Instagram"><input className={inputCls} value={instagram} onChange={(e) => setInstagram(e.target.value)} /></Field>
        <Field label="WhatsApp"><input className={inputCls} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></Field>
        <Field label="Email"><input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Temperatura *">
          <select className={inputCls} value={temperatura} onChange={(e) => setTemperatura(e.target.value)}>
            {TEMPERATURAS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Status *">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            {CONTACT_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Origem">
          <select className={inputCls} value={origem} onChange={(e) => setOrigem(e.target.value)}>
            <option value="">—</option>
            {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Prospecção">
          <select className={inputCls} value={prospeccao} onChange={(e) => setProspeccao(e.target.value)}>
            <option value="">—</option>
            {prospOptions.map((p: string) => <option key={p} value={p}>{p}</option>)}
            <option value="__custom">+ Outro...</option>
          </select>
        </Field>
        <Field label="Data acionado"><input type="date" className={inputCls} value={acionadoEm} onChange={(e) => setAcionadoEm(e.target.value)} /></Field>
        {prospeccao === "__custom" && (
          <Field label="Nova categoria"><input className={inputCls} value={prospCustom} onChange={(e) => setProspCustom(e.target.value)} /></Field>
        )}
        <Field label="Próxima ação"><input className={inputCls} value={nextAction} onChange={(e) => setNextAction(e.target.value)} /></Field>
        <Field label="Data follow-up"><input type="date" className={inputCls} value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} /></Field>
        <Field label="Objetivo do follow-up"><input className={inputCls} value={followUpObj} onChange={(e) => setFollowUpObj(e.target.value)} /></Field>
      </div>
      <Field label="Notas"><textarea className={inputCls} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <Field label="Pontos em comum">
        <ToggleList items={comum} onAdd={(s) => setComum([...comum, s])} onRemove={(i) => setComum(comum.filter((_, j) => j !== i))} />
      </Field>
      <div className="flex gap-2 justify-end mt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>Salvar</Btn></div>
    </Modal>
  );
}

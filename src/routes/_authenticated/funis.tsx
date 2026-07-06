import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, Btn, Modal, Field, inputCls, Tag, EmptyState } from "@/components/ui-custom";
import { Pencil, Trash2, X, Plus, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/funis")({
  head: () => ({ meta: [{ title: "Funis — Painel" }] }),
  component: FunnelsPage,
});

const COLORS = ["var(--terracota)", "var(--gold)", "var(--sage)", "var(--blue)", "var(--blush)", "var(--sage-light)"];

type Step = { action: string; description?: string };

function FunnelsPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: funnels = [] } = useQuery({
    queryKey: ["funnels", uid],
    queryFn: async () => {
      const { data } = await supabase.from("funnels").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const inv = () => qc.invalidateQueries({ queryKey: ["funnels"] });
  const remove = async (id: string) => { await supabase.from("funnels").delete().eq("id", id); toast.success("Removido"); inv(); };

  return (
    <div>
      <PageHeader title="Funis de Vendas">
        <Btn onClick={() => { setEditing(null); setOpen(true); }}>+ Novo funil</Btn>
      </PageHeader>

      {funnels.length === 0 ? <EmptyState icon="🔀" text="Nenhum funil criado" /> : (
        <div className="space-y-4">
          {funnels.map((f: any) => {
            const steps = (f.steps as Step[]) ?? [];
            return (
              <div key={f.id} className="bg-bg-primary border border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display text-xl">{f.name || "Funil"}</h3>
                    {f.description && <p className="text-sm text-text-secondary">{f.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {f.tested ? <Tag color="sage"><CheckCircle2 size={10} className="inline mr-1" />Testado · {f.converted ?? 0}</Tag> : <Tag color="neutral">Não testado</Tag>}
                    <Tag color="dark">{steps.length} etapas</Tag>
                    <button onClick={() => { setEditing(f); setOpen(true); }} className="text-text-tertiary hover:text-terracota"><Pencil size={14} /></button>
                    <button onClick={() => remove(f.id)} className="text-text-tertiary hover:text-[#e05c5c]"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 shrink-0">
                      <div className="min-w-[220px] bg-bg-secondary rounded-lg p-3 border-l-4" style={{ borderColor: COLORS[i % COLORS.length] }}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono text-bg-primary" style={{ background: COLORS[i % COLORS.length] }}>{i + 1}</div>
                          <div className="font-medium text-sm">{s.action || "—"}</div>
                        </div>
                        {s.description && <div className="text-xs text-text-secondary">{s.description}</div>}
                      </div>
                      {i < steps.length - 1 && <ArrowRight size={16} className="text-text-tertiary" />}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && <FunnelModal uid={uid} editing={editing} onClose={() => setOpen(false)} onSaved={inv} />}
    </div>
  );
}

function FunnelModal({ uid, editing, onClose, onSaved }: any) {
  const e = editing ?? {};
  const [name, setName] = useState(e.name ?? "");
  const [description, setDescription] = useState(e.description ?? "");
  const [tested, setTested] = useState<boolean>(!!e.tested);
  const [converted, setConverted] = useState<number>(e.converted ?? 0);
  const [steps, setSteps] = useState<Step[]>(
    (e.steps as Step[])?.length ? e.steps : [{ action: "", description: "" }]
  );

  const updateStep = (i: number, k: keyof Step, v: string) => {
    const s = steps.slice(); s[i] = { ...s[i], [k]: v }; setSteps(s);
  };

  const save = async () => {
    const filtered = steps.filter(s => s.action.trim());
    if (filtered.length === 0) { toast.error("Adicione ao menos uma ação"); return; }
    const payload: any = {
      name: name.trim() || `Funil ${new Date().toLocaleDateString("pt-BR")}`,
      description, steps: filtered, tested, converted: Number(converted) || 0,
    };
    if (editing?.id) await supabase.from("funnels").update(payload).eq("id", editing.id);
    else await supabase.from("funnels").insert({ ...payload, user_id: uid });
    toast.success("Salvo"); onSaved(); onClose();
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Editar funil" : "Novo funil"} wide>
      <Field label="Nome"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Funil de aquisição" autoFocus /></Field>
      <Field label="Descrição"><input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <div className="label-mono mb-2">Etapas</div>
      <div className="space-y-2 mb-3">
        {steps.map((s, i) => (
          <div key={i} className="grid grid-cols-[auto,1fr,2fr,auto] gap-2 items-center">
            <span className="w-6 h-6 rounded-full bg-terracota text-bg-primary flex items-center justify-center text-xs font-mono">{i + 1}</span>
            <input className={inputCls} placeholder="Ação*" value={s.action} onChange={(ev) => updateStep(i, "action", ev.target.value)} />
            <input className={inputCls} placeholder="Descrição" value={s.description ?? ""} onChange={(ev) => updateStep(i, "description", ev.target.value)} />
            <button onClick={() => setSteps(steps.filter((_, j) => j !== i))} className="text-text-tertiary hover:text-[#e05c5c]"><X size={16} /></button>
          </div>
        ))}
      </div>
      <Btn variant="ghost" onClick={() => setSteps([...steps, { action: "", description: "" }])}><Plus size={14} className="inline mr-1" />Etapa</Btn>

      <div className="mt-5 p-3 bg-bg-secondary rounded-lg">
        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input type="checkbox" checked={tested} onChange={(e) => setTested(e.target.checked)} />
          <span className="text-sm">Já testei este funil</span>
        </label>
        {tested && (
          <Field label="Quantas pessoas converteram?">
            <input type="number" min={0} className={inputCls} value={converted} onChange={(e) => setConverted(+e.target.value)} />
          </Field>
        )}
      </div>

      <div className="flex gap-2 justify-end mt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>Salvar</Btn></div>
    </Modal>
  );
}

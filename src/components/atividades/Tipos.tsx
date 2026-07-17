import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Field, inputCls, Modal, EmptyState } from "@/components/ui-custom";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

export function TiposCrud({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#C4714A");
  const [reassignFrom, setReassignFrom] = useState<any>(null);
  const [reassignTo, setReassignTo] = useState("");

  const { data: tipos = [] } = useQuery({
    queryKey: ["tipos", userId],
    queryFn: async () => {
      const { data } = await supabase.from("tipos_projeto").select("*").eq("user_id", userId).order("nome");
      return data || [];
    },
  });

  const { data: countByTipo = {} } = useQuery({
    queryKey: ["tipos-count", userId],
    queryFn: async () => {
      const { data } = await supabase.from("projetos").select("tipo_id").eq("user_id", userId);
      const m: Record<string, number> = {};
      (data || []).forEach((p: any) => { m[p.tipo_id] = (m[p.tipo_id] || 0) + 1; });
      return m;
    },
  });

  const openNew = () => { setEditing(null); setNome(""); setCor("#C4714A"); setOpen(true); };
  const openEdit = (t: any) => { setEditing(t); setNome(t.nome); setCor(t.cor || "#C4714A"); setOpen(true); };

  const save = async () => {
    if (!nome.trim()) return toast.error("Nome obrigatório");
    const payload = { user_id: userId, nome, cor };
    const { error } = editing
      ? await supabase.from("tipos_projeto").update({ nome, cor }).eq("id", editing.id)
      : await supabase.from("tipos_projeto").insert(payload);
    if (error) return toast.error(error.message);
    setOpen(false); qc.invalidateQueries({ queryKey: ["tipos"] });
    toast.success("Salvo");
  };

  const tryDelete = async (t: any) => {
    const n = countByTipo[t.id] || 0;
    if (n > 0) { setReassignFrom(t); setReassignTo(""); return; }
    if (!confirm("Excluir tipo?")) return;
    const { error } = await supabase.from("tipos_projeto").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries();
  };

  const doReassign = async () => {
    if (!reassignTo) return toast.error("Escolha um tipo destino");
    const { error: e1 } = await supabase.from("projetos").update({ tipo_id: reassignTo }).eq("tipo_id", reassignFrom.id);
    if (e1) return toast.error(e1.message);
    const { error: e2 } = await supabase.from("tipos_projeto").delete().eq("id", reassignFrom.id);
    if (e2) return toast.error(e2.message);
    setReassignFrom(null); qc.invalidateQueries();
    toast.success("Tipo excluído com reatribuição");
  };

  return (
    <div>
      <p className="text-sm text-text-secondary mb-4">
        Categorias que classificam os projetos (ex.: Conteúdo, Comercial, Estudos). Cada projeto tem exatamente um tipo, o que permite consolidar horas e resultados por área.
      </p>
      <div className="flex justify-end mb-4"><Btn onClick={openNew}>+ Novo tipo</Btn></div>
      {tipos.length === 0 ? <EmptyState icon="🎨" text="Nenhum tipo" /> : (
        <ul className="space-y-2">
          {tipos.map(t => (
            <li key={t.id} className="flex items-center justify-between p-3 bg-bg-primary border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full" style={{ background: t.cor || "#999" }} />
                <span className="font-medium">{t.nome}</span>
                <span className="text-xs font-mono text-text-tertiary">{countByTipo[t.id] || 0} projeto(s)</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(t)} className="text-text-tertiary hover:text-text-primary p-1"><Pencil size={14} /></button>
                <button onClick={() => tryDelete(t)} className="text-text-tertiary hover:text-terracota p-1"><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar tipo" : "Novo tipo"}>
        <Field label="Nome"><input className={inputCls} value={nome} onChange={e => setNome(e.target.value)} /></Field>
        <Field label="Cor"><input type="color" value={cor} onChange={e => setCor(e.target.value)} className="w-16 h-10 border rounded" /></Field>
        <div className="flex gap-2 justify-end"><Btn variant="ghost" onClick={() => setOpen(false)}>Cancelar</Btn><Btn onClick={save}>Salvar</Btn></div>
      </Modal>

      <Modal open={!!reassignFrom} onClose={() => setReassignFrom(null)} title="Reatribuir projetos antes de excluir">
        <div className="text-sm mb-3">O tipo <b>{reassignFrom?.nome}</b> tem {countByTipo[reassignFrom?.id] || 0} projeto(s). Escolha outro tipo:</div>
        <Field label="Novo tipo">
          <select className={inputCls} value={reassignTo} onChange={e => setReassignTo(e.target.value)}>
            <option value="">Selecione</option>
            {tipos.filter(t => t.id !== reassignFrom?.id).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </Field>
        <div className="flex gap-2 justify-end"><Btn variant="ghost" onClick={() => setReassignFrom(null)}>Cancelar</Btn><Btn variant="danger" onClick={doReassign}>Reatribuir e excluir</Btn></div>
      </Modal>
    </div>
  );
}

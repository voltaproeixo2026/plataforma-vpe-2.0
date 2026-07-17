import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Field, inputCls, Modal, EmptyState } from "@/components/ui-custom";
import { fmtDateBR } from "@/lib/atividades";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

export function IntencoesCrud({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");

  const { data: itens = [] } = useQuery({
    queryKey: ["intencoes", userId],
    queryFn: async () => {
      const { data } = await supabase.from("intencoes").select("*").eq("user_id", userId).order("periodo_inicio", { ascending: false });
      return data || [];
    },
  });

  const openNew = () => { setEditing(null); setTitulo(""); setDescricao(""); setInicio(""); setFim(""); setOpen(true); };
  const openEdit = (i: any) => { setEditing(i); setTitulo(i.titulo); setDescricao(i.descricao || ""); setInicio(i.periodo_inicio || ""); setFim(i.periodo_fim || ""); setOpen(true); };

  const save = async () => {
    if (!titulo.trim()) return toast.error("Título obrigatório");
    const payload: any = { user_id: userId, titulo, descricao: descricao || null, periodo_fim: fim || null };
    if (inicio) payload.periodo_inicio = inicio;
    const { error } = editing
      ? await supabase.from("intencoes").update(payload).eq("id", editing.id)
      : await supabase.from("intencoes").insert(payload);
    if (error) return toast.error(error.message);
    setOpen(false); qc.invalidateQueries({ queryKey: ["intencoes"] });
    toast.success("Salvo");
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir?")) return;
    await supabase.from("intencoes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["intencoes"] });
  };

  return (
    <div>
      <p className="text-sm text-text-secondary mb-4">Objetivos maiores do período que agrupam projetos.</p>
      <div className="flex justify-end mb-4"><Btn onClick={openNew}>+ Nova intenção</Btn></div>
      {itens.length === 0 ? <EmptyState icon="✨" text="Nenhuma intenção ainda" /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {itens.map(i => (
            <div key={i.id} className="bg-bg-primary border border-border rounded-xl p-4">
              <div className="flex justify-between gap-2">
                <div className="font-display text-lg text-text-primary">{i.titulo}</div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(i)} className="text-text-tertiary hover:text-text-primary p-1"><Pencil size={14} /></button>
                  <button onClick={() => remove(i.id)} className="text-text-tertiary hover:text-terracota p-1"><Trash2 size={14} /></button>
                </div>
              </div>
              {i.descricao && <div className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">{i.descricao}</div>}
              <div className="text-xs font-mono text-text-tertiary mt-2">{fmtDateBR(i.periodo_inicio)} {i.periodo_fim ? `→ ${fmtDateBR(i.periodo_fim)}` : ""}</div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar intenção" : "Nova intenção"}>
        <Field label="Título"><input className={inputCls} value={titulo} onChange={e => setTitulo(e.target.value)} /></Field>
        <Field label="Descrição"><textarea className={inputCls} rows={3} value={descricao} onChange={e => setDescricao(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início"><input type="date" className={inputCls} value={inicio} onChange={e => setInicio(e.target.value)} /></Field>
          <Field label="Fim (opcional)"><input type="date" className={inputCls} value={fim} onChange={e => setFim(e.target.value)} /></Field>
        </div>
        <div className="flex gap-2 justify-end"><Btn variant="ghost" onClick={() => setOpen(false)}>Cancelar</Btn><Btn onClick={save}>Salvar</Btn></div>
      </Modal>
    </div>
  );
}

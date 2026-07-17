import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, Btn, Modal, Field, inputCls, EmptyState } from "@/components/ui-custom";
import { toast } from "sonner";
import { X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/atividades/intencoes")({
  component: IntencoesPage,
});

function IntencoesPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: intencoes = [] } = useQuery({
    queryKey: ["intencoes", uid],
    queryFn: async () => (await supabase.from("intencoes").select("*").order("periodo_inicio", { ascending: false })).data ?? [],
  });
  const { data: counts = {} } = useQuery({
    queryKey: ["intencoes_counts", uid, intencoes.length],
    queryFn: async () => {
      const { data } = await supabase.from("projetos").select("intencao_id");
      const c: Record<string, number> = {};
      (data ?? []).forEach((p: any) => p.intencao_id && (c[p.intencao_id] = (c[p.intencao_id] || 0) + 1));
      return c;
    },
  });

  const inv = () => qc.invalidateQueries({ queryKey: ["intencoes"] });

  return (
    <div>
      <PageHeader title="Intenções" subtitle="Objetivos maiores do período que agrupam projetos">
        <Btn onClick={() => { setEditing(null); setOpen(true); }}>+ Nova intenção</Btn>
      </PageHeader>

      {intencoes.length === 0 ? <EmptyState icon="🎯" text="Nenhuma intenção ainda" /> : (
        <div className="grid md:grid-cols-2 gap-3">
          {intencoes.map((i: any) => (
            <div key={i.id} className="bg-bg-primary border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-display text-lg flex-1">{i.titulo}</div>
                <button onClick={() => { setEditing(i); setOpen(true); }} className="text-xs font-mono text-text-tertiary hover:text-terracota">editar</button>
                <button onClick={async () => { if (confirm("Excluir intenção? Projetos vinculados ficam sem intenção.")) { await supabase.from("intencoes").delete().eq("id", i.id); inv(); } }} className="text-text-tertiary hover:text-[#e05c5c]"><X size={14} /></button>
              </div>
              {i.descricao && <p className="text-sm text-text-secondary mt-2">{i.descricao}</p>}
              <div className="text-xs font-mono text-text-tertiary mt-3">
                {new Date(i.periodo_inicio + "T12:00").toLocaleDateString("pt-BR")}
                {i.periodo_fim && ` – ${new Date(i.periodo_fim + "T12:00").toLocaleDateString("pt-BR")}`}
                {" · "}{counts[i.id] ?? 0} projeto(s)
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <IntencaoModal uid={uid} editing={editing} onClose={() => setOpen(false)} onSaved={inv} />}
    </div>
  );
}

function IntencaoModal({ uid, editing, onClose, onSaved }: any) {
  const e = editing ?? {};
  const [titulo, setTitulo] = useState(e.titulo ?? "");
  const [descricao, setDescricao] = useState(e.descricao ?? "");
  const [ini, setIni] = useState(e.periodo_inicio ?? new Date().toISOString().slice(0, 10));
  const [fim, setFim] = useState(e.periodo_fim ?? "");

  const save = async () => {
    if (!titulo.trim()) return toast.error("Título obrigatório");
    const payload = { titulo, descricao: descricao || null, periodo_inicio: ini, periodo_fim: fim || null };
    if (editing?.id) {
      await supabase.from("intencoes").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("intencoes").insert({ ...payload, user_id: uid });
    }
    toast.success("Salvo");
    onSaved(); onClose();
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Editar intenção" : "Nova intenção"}>
      <Field label="Título *"><input className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus placeholder="Ex: Vender identidade visual" /></Field>
      <Field label="Descrição"><textarea className={inputCls} rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Início"><input type="date" className={inputCls} value={ini} onChange={(e) => setIni(e.target.value)} /></Field>
        <Field label="Fim (opcional)"><input type="date" className={inputCls} value={fim} onChange={(e) => setFim(e.target.value)} /></Field>
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={save}>Salvar</Btn>
      </div>
    </Modal>
  );
}

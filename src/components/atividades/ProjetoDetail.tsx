import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Field, inputCls, Modal, EmptyState, ProgressBar } from "@/components/ui-custom";
import { fmtHoras, fmtDateBR } from "@/lib/atividades";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, Plus, Check, Clock } from "lucide-react";
import { RegistrarHorasModal } from "./RegistrarHorasModal";

const TAREFA_STATUS: Record<string, string> = {
  a_fazer: "A fazer", em_progresso: "Em progresso", concluida: "Concluída", cancelada: "Cancelada",
};

export function ProjetoDetail({ projetoId, userId, onBack }: { projetoId: string; userId: string; onBack: () => void }) {
  const qc = useQueryClient();
  // Hooks TODOS no topo, incondicionalmente
  const [showHoras, setShowHoras] = useState(false);
  const [tarefaModal, setTarefaModal] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<any>(null);
  const [tTitulo, setTTitulo] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [tData, setTData] = useState("");
  const [tStatus, setTStatus] = useState("a_fazer");
  const [tParent, setTParent] = useState("");

  const projetoQ = useQuery({
    queryKey: ["projeto", projetoId],
    queryFn: async () => (await supabase.from("projetos").select("*, tipos_projeto(nome, cor), semanas(nome), intencoes(titulo)").eq("id", projetoId).maybeSingle()).data,
  });

  const tarefasQ = useQuery({
    queryKey: ["tarefas", projetoId],
    queryFn: async () => (await supabase.from("tarefas_projeto").select("*").eq("projeto_id", projetoId).order("ordem")).data || [],
  });

  const registrosQ = useQuery({
    queryKey: ["registros", projetoId],
    queryFn: async () => (await supabase.from("registros_tempo").select("*").eq("projeto_id", projetoId).order("data", { ascending: false })).data || [],
  });

  const projeto = projetoQ.data;
  const tarefas = tarefasQ.data || [];
  const registros = registrosQ.data || [];

  const tree = useMemo(() => {
    const byParent: Record<string, any[]> = {};
    tarefas.forEach((t: any) => {
      const key = t.parent_id || "root";
      byParent[key] = byParent[key] || [];
      byParent[key].push(t);
    });
    return byParent;
  }, [tarefas]);

  const openNewTarefa = (parent: string | null) => {
    setEditingTarefa(null); setTTitulo(""); setTDesc(""); setTData(""); setTStatus("a_fazer"); setTParent(parent || "");
    setTarefaModal(true);
  };
  const openEditTarefa = (t: any) => {
    setEditingTarefa(t); setTTitulo(t.titulo); setTDesc(t.descricao || ""); setTData(t.data || ""); setTStatus(t.status); setTParent(t.parent_id || "");
    setTarefaModal(true);
  };

  const saveTarefa = async () => {
    if (!tTitulo.trim()) return toast.error("Título obrigatório");
    const payload: any = {
      user_id: userId, projeto_id: projetoId, titulo: tTitulo,
      descricao: tDesc || null, data: tData || null, status: tStatus,
      parent_id: tParent || null,
    };
    const { error } = editingTarefa
      ? await supabase.from("tarefas_projeto").update(payload).eq("id", editingTarefa.id)
      : await supabase.from("tarefas_projeto").insert(payload);
    if (error) return toast.error(error.message);
    setTarefaModal(false);
    qc.invalidateQueries({ queryKey: ["tarefas", projetoId] });
    qc.invalidateQueries({ queryKey: ["projeto", projetoId] });
    qc.invalidateQueries({ queryKey: ["projetos"] });
  };

  const toggleTarefa = async (t: any) => {
    const novo = t.status === "concluida" ? "a_fazer" : "concluida";
    await supabase.from("tarefas_projeto").update({ status: novo }).eq("id", t.id);
    qc.invalidateQueries({ queryKey: ["tarefas", projetoId] });
    qc.invalidateQueries({ queryKey: ["projeto", projetoId] });
    qc.invalidateQueries({ queryKey: ["projetos"] });
  };

  const removeTarefa = async (id: string) => {
    if (!confirm("Excluir tarefa?")) return;
    await supabase.from("tarefas_projeto").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tarefas", projetoId] });
    qc.invalidateQueries({ queryKey: ["projeto", projetoId] });
    qc.invalidateQueries({ queryKey: ["projetos"] });
  };

  const removeRegistro = async (id: string) => {
    if (!confirm("Excluir registro?")) return;
    await supabase.from("registros_tempo").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["registros", projetoId] });
    qc.invalidateQueries({ queryKey: ["projeto", projetoId] });
    qc.invalidateQueries({ queryKey: ["projetos"] });
  };

  const renderTarefas = (parentKey: string, depth = 0): React.ReactNode => {
    const list = tree[parentKey] || [];
    if (list.length === 0) return null;
    return (
      <ul className={depth === 0 ? "space-y-2" : "space-y-2 mt-2 ml-6 border-l border-border pl-3"}>
        {list.map((t: any) => (
          <li key={t.id}>
            <div className="flex items-start gap-2 p-2 border border-border rounded-lg bg-bg-primary">
              <button onClick={() => toggleTarefa(t)}
                className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center ${t.status === "concluida" ? "bg-sage border-sage text-bg-primary" : "border-border"}`}>
                {t.status === "concluida" && <Check size={12} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${t.status === "concluida" ? "line-through text-text-tertiary" : "text-text-primary"}`}>{t.titulo}</div>
                {t.descricao && <div className="text-xs text-text-secondary mt-1 whitespace-pre-wrap">{t.descricao}</div>}
                <div className="flex flex-wrap gap-2 mt-1 text-[10px] font-mono text-text-tertiary">
                  <span>{TAREFA_STATUS[t.status]}</span>
                  {t.data && <span>· 📅 {fmtDateBR(t.data)}</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => openNewTarefa(t.id)} title="Subtarefa" className="text-text-tertiary hover:text-text-primary p-1"><Plus size={12} /></button>
                <button onClick={() => openEditTarefa(t)} className="text-text-tertiary hover:text-text-primary p-1"><Pencil size={12} /></button>
                <button onClick={() => removeTarefa(t.id)} className="text-text-tertiary hover:text-terracota p-1"><Trash2 size={12} /></button>
              </div>
            </div>
            {renderTarefas(t.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  };

  if (projetoQ.isLoading) return <div className="text-text-tertiary font-mono text-sm">Carregando...</div>;
  if (!projeto) return <div><Btn variant="ghost" onClick={onBack}>← Voltar</Btn><div className="mt-4">Projeto não encontrado</div></div>;

  const rootTarefas = tree.root || [];

  return (
    <div>
      <Btn variant="ghost" onClick={onBack} className="mb-4"><ArrowLeft size={14} className="inline mr-1" /> Voltar</Btn>

      <div className="bg-bg-primary border border-border rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full" style={{ background: projeto.tipos_projeto?.cor || "#999" }} />
          <span className="text-xs font-mono text-text-tertiary">{projeto.tipos_projeto?.nome} · {projeto.status}</span>
        </div>
        <h2 className="font-display text-3xl text-text-primary">{projeto.titulo}</h2>
        {projeto.descricao && <p className="text-text-secondary mt-2 whitespace-pre-wrap">{projeto.descricao}</p>}
        <div className="flex flex-wrap gap-4 text-xs font-mono text-text-tertiary mt-3">
          {projeto.semanas?.nome && <span>📅 {projeto.semanas.nome}</span>}
          {projeto.intencoes?.titulo && <span>✨ {projeto.intencoes.titulo}</span>}
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <div className="label-mono mb-1">Progresso</div>
            <ProgressBar value={Number(projeto.percentual_conclusao)} max={100} rightLabel={`${Math.round(Number(projeto.percentual_conclusao))}%`} />
          </div>
          <div>
            <div className="label-mono mb-1">Tempo dedicado</div>
            <div className="font-mono text-2xl text-text-primary">{fmtHoras(Number(projeto.horas_totais))}</div>
          </div>
        </div>
        <div className="mt-4"><Btn onClick={() => setShowHoras(true)}><Clock size={14} className="inline mr-1" /> + registrar horas</Btn></div>
      </div>

      <div className="bg-bg-primary border border-border rounded-xl p-5 mb-6">
        <div className="flex justify-between items-center mb-3">
          <div className="font-display text-xl">Tarefas</div>
          <Btn onClick={() => openNewTarefa(null)}>+ Nova tarefa</Btn>
        </div>
        {rootTarefas.length === 0 ? <EmptyState icon="✅" text="Nenhuma tarefa" /> : renderTarefas("root")}
      </div>

      <div className="bg-bg-primary border border-border rounded-xl p-5">
        <div className="font-display text-xl mb-3">Registros de tempo</div>
        {registros.length === 0 ? <EmptyState icon="⏱" text="Sem registros ainda" /> : (
          <ul className="space-y-2">
            {registros.map((r: any) => (
              <li key={r.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <div className="font-mono text-sm">{fmtHoras(r.duracao_minutos / 60)}</div>
                  <div className="text-xs font-mono text-text-tertiary">{fmtDateBR(r.data)} · {r.origem}</div>
                  {r.observacao && <div className="text-xs text-text-secondary mt-1">{r.observacao}</div>}
                </div>
                <button onClick={() => removeRegistro(r.id)} className="text-text-tertiary hover:text-terracota"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <RegistrarHorasModal open={showHoras} onClose={() => setShowHoras(false)}
        projetoId={projetoId} userId={userId} onSaved={() => {
          qc.invalidateQueries({ queryKey: ["registros", projetoId] });
          qc.invalidateQueries({ queryKey: ["projeto", projetoId] });
          qc.invalidateQueries({ queryKey: ["projetos"] });
        }} />

      <Modal open={tarefaModal} onClose={() => setTarefaModal(false)} title={editingTarefa ? "Editar tarefa" : "Nova tarefa"}>
        <Field label="Título"><input className={inputCls} value={tTitulo} onChange={e => setTTitulo(e.target.value)} /></Field>
        <Field label="Descrição"><textarea className={inputCls} rows={3} value={tDesc} onChange={e => setTDesc(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data (opcional)"><input type="date" className={inputCls} value={tData} onChange={e => setTData(e.target.value)} /></Field>
          <Field label="Status">
            <select className={inputCls} value={tStatus} onChange={e => setTStatus(e.target.value)}>
              {Object.entries(TAREFA_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        {tParent && <div className="text-xs font-mono text-text-tertiary mb-2">Subtarefa</div>}
        <div className="flex gap-2 justify-end"><Btn variant="ghost" onClick={() => setTarefaModal(false)}>Cancelar</Btn><Btn onClick={saveTarefa}>Salvar</Btn></div>
      </Modal>
    </div>
  );
}

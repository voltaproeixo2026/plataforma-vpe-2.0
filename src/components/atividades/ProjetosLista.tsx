import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Field, inputCls, Modal, EmptyState, Chip } from "@/components/ui-custom";
import { fmtHoras } from "@/lib/atividades";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  planejamento: "Planejamento", ativo: "Ativo", concluido: "Concluído", cancelado: "Cancelado",
};

export function ProjetosLista({ userId, onOpen }: { userId: string; onOpen: (id: string) => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [intencaoId, setIntencaoId] = useState("");
  const [semanaId, setSemanaId] = useState("");
  const [status, setStatus] = useState<string>("planejamento");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroSemana, setFiltroSemana] = useState("");

  const { data: projetos = [] } = useQuery({
    queryKey: ["projetos", userId],
    queryFn: async () => {
      const { data } = await supabase.from("projetos").select("*, tipos_projeto(nome, cor), semanas(nome), intencoes(titulo)").eq("user_id", userId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: tipos = [] } = useQuery({
    queryKey: ["tipos", userId],
    queryFn: async () => (await supabase.from("tipos_projeto").select("*").eq("user_id", userId).order("nome")).data || [],
  });

  const { data: cicloAtivo } = useQuery({
    queryKey: ["ciclo-ativo-for-proj", userId],
    queryFn: async () => (await supabase.from("ciclos").select("id").eq("user_id", userId).eq("status", "ativo").maybeSingle()).data,
  });

  const { data: semanas = [] } = useQuery({
    queryKey: ["semanas-for-proj", cicloAtivo?.id],
    queryFn: async () => {
      if (!cicloAtivo?.id) return [];
      return (await supabase.from("semanas").select("*").eq("ciclo_id", cicloAtivo.id).order("ordem_no_ciclo")).data || [];
    },
    enabled: !!cicloAtivo?.id,
  });

  const { data: intencoes = [] } = useQuery({
    queryKey: ["intencoes-select", userId],
    queryFn: async () => (await supabase.from("intencoes").select("id, titulo").eq("user_id", userId)).data || [],
  });

  const openNew = () => {
    setEditing(null); setTitulo(""); setDescricao("");
    setTipoId(tipos[0]?.id || ""); setIntencaoId(""); setSemanaId(""); setStatus("planejamento");
    setOpen(true);
  };
  const openEdit = (p: any) => {
    setEditing(p); setTitulo(p.titulo); setDescricao(p.descricao || "");
    setTipoId(p.tipo_id); setIntencaoId(p.intencao_id || ""); setSemanaId(p.semana_id || ""); setStatus(p.status);
    setOpen(true);
  };

  const save = async () => {
    if (!titulo.trim()) return toast.error("Título obrigatório");
    if (!tipoId) return toast.error("Tipo obrigatório");
    if (status === "ativo" && !semanaId) return toast.error("Projeto ativo precisa de semana");
    const payload: any = {
      user_id: userId, titulo, descricao: descricao || null,
      tipo_id: tipoId, intencao_id: intencaoId || null, semana_id: semanaId || null, status,
    };
    const { error } = editing
      ? await supabase.from("projetos").update(payload).eq("id", editing.id)
      : await supabase.from("projetos").insert(payload);
    if (error) return toast.error(error.message);
    setOpen(false); qc.invalidateQueries({ queryKey: ["projetos"] });
    toast.success("Salvo");
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir projeto e tudo dentro dele?")) return;
    const { error } = await supabase.from("projetos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["projetos"] });
  };

  const filtered = useMemo(() => projetos.filter((p: any) =>
    (!filtroTipo || p.tipo_id === filtroTipo) && (!filtroSemana || p.semana_id === filtroSemana)
  ), [projetos, filtroTipo, filtroSemana]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={inputCls + " max-w-xs"}>
            <option value="">Todos os tipos</option>
            {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <select value={filtroSemana} onChange={e => setFiltroSemana(e.target.value)} className={inputCls + " max-w-xs"}>
            <option value="">Todas as semanas</option>
            {semanas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <Btn onClick={openNew}>+ Novo projeto</Btn>
      </div>

      {filtered.length === 0 ? <EmptyState icon="📦" text="Nenhum projeto" /> : (
        <div className="grid gap-3">
          {filtered.map((p: any) => (
            <div key={p.id} className="bg-bg-primary border border-border rounded-xl p-4">
              <div className="flex justify-between gap-2 mb-2">
                <button onClick={() => onOpen(p.id)} className="text-left flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full" style={{ background: p.tipos_projeto?.cor || "#999" }} />
                    <span className="text-xs font-mono text-text-tertiary">{p.tipos_projeto?.nome}</span>
                    <Chip active={false}>{STATUS_LABELS[p.status]}</Chip>
                  </div>
                  <div className="font-display text-lg text-text-primary hover:text-terracota">{p.titulo}</div>
                  {p.descricao && <div className="text-sm text-text-secondary line-clamp-2">{p.descricao}</div>}
                </button>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="text-text-tertiary hover:text-text-primary p-1"><Pencil size={14} /></button>
                  <button onClick={() => remove(p.id)} className="text-text-tertiary hover:text-terracota p-1"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs font-mono text-text-tertiary mb-2">
                {p.semanas?.nome && <span>📅 {p.semanas.nome}</span>}
                {p.intencoes?.titulo && <span>✨ {p.intencoes.titulo}</span>}
                <span>⏱ {fmtHoras(Number(p.horas_totais))}</span>
              </div>
              <ProgressBar value={Number(p.percentual_conclusao)} max={100} rightLabel={`${Math.round(Number(p.percentual_conclusao))}%`} />
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar projeto" : "Novo projeto"} wide>
        <Field label="Título"><input className={inputCls} value={titulo} onChange={e => setTitulo(e.target.value)} /></Field>
        <Field label="Descrição"><textarea className={inputCls} rows={3} value={descricao} onChange={e => setDescricao(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo *">
            <select className={inputCls} value={tipoId} onChange={e => setTipoId(e.target.value)}>
              <option value="">Selecione</option>
              {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputCls} value={status} onChange={e => setStatus(e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Intenção (opcional)">
            <select className={inputCls} value={intencaoId} onChange={e => setIntencaoId(e.target.value)}>
              <option value="">—</option>
              {intencoes.map(i => <option key={i.id} value={i.id}>{i.titulo}</option>)}
            </select>
          </Field>
          <Field label={"Semana" + (status === "ativo" ? " *" : " (opcional)")}>
            <select className={inputCls} value={semanaId} onChange={e => setSemanaId(e.target.value)}>
              <option value="">—</option>
              {semanas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex gap-2 justify-end"><Btn variant="ghost" onClick={() => setOpen(false)}>Cancelar</Btn><Btn onClick={save}>Salvar</Btn></div>
      </Modal>
    </div>
  );
}

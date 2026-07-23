import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, Btn, Modal, Field, inputCls, Tag, EmptyState, ProgressBar } from "@/components/ui-custom";
import { PROJETO_STATUS, ensureDefaultTipos } from "@/lib/atividades-helpers";
import { useSemanaFixada } from "@/hooks/use-semana-fixada";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/atividades/")({
  component: ProjetosPage,
});

function ProjetosPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [view, setView] = useState<"lista" | "kanban">("lista");
  const { semanaFixada, setSemanaFixada } = useSemanaFixada();
  // Default para a preferência do usuário; "todas" quando não há preferência.
  const filtroSemana = semanaFixada ?? "todas";
  const setFiltroSemana = (v: string) => setSemanaFixada(v === "todas" ? "" : v);

  useEffect(() => { ensureDefaultTipos(uid); }, [uid]);

  const { data: projetos = [] } = useQuery({
    queryKey: ["projetos", uid],
    queryFn: async () => {
      const { data } = await supabase.from("projetos").select("*, tipos_projeto(nome,cor), semanas(nome,data_inicio,data_fim), intencoes(titulo)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: tipos = [] } = useQuery({
    queryKey: ["tipos_projeto", uid],
    queryFn: async () => (await supabase.from("tipos_projeto").select("*").order("nome")).data ?? [],
  });
  const { data: semanas = [] } = useQuery({
    queryKey: ["semanas", uid],
    queryFn: async () => (await supabase.from("semanas").select("*").order("data_inicio", { ascending: false })).data ?? [],
  });
  const { data: intencoes = [] } = useQuery({
    queryKey: ["intencoes", uid],
    queryFn: async () => (await supabase.from("intencoes").select("*").order("periodo_inicio", { ascending: false })).data ?? [],
  });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["projetos"] }); };

  const filtrados = useMemo(() => {
    if (filtroSemana === "todas") return projetos;
    if (filtroSemana === "sem") return projetos.filter((p: any) => !p.semana_id);
    return projetos.filter((p: any) => p.semana_id === filtroSemana);
  }, [projetos, filtroSemana]);

  const porTipo = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const p of filtrados) {
      const key = p.tipo_id;
      (map[key] ||= []).push(p);
    }
    return map;
  }, [filtrados]);

  return (
    <div>
      <PageHeader title="Projetos" subtitle="Intenção → Projeto → Tarefa">
        <Btn variant="ghost" onClick={() => setView(view === "lista" ? "kanban" : "lista")}>
          {view === "lista" ? "Ver Kanban" : "Ver Lista"}
        </Btn>
        <Btn onClick={() => { setEditing(null); setOpen(true); }} disabled={tipos.length === 0}>+ Novo projeto</Btn>
      </PageHeader>

      {intencoes.length > 0 && (
        <div className="mb-6">
          <div className="label-mono mb-2">Intenções do período</div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {intencoes.slice(0, 8).map((i: any) => {
              const projs = projetos.filter((p: any) => p.intencao_id === i.id);
              return (
                <div key={i.id} className="min-w-[240px] bg-bg-secondary border border-border rounded-xl p-4">
                  <div className="font-display text-lg">{i.titulo}</div>
                  {i.descricao && <div className="text-xs text-text-tertiary mt-1 line-clamp-2">{i.descricao}</div>}
                  <div className="text-[11px] font-mono text-text-tertiary mt-2">{projs.length} projeto(s)</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <span className="label-mono">Semana:</span>
        <select className={inputCls + " w-auto"} value={filtroSemana} onChange={(e) => setFiltroSemana(e.target.value)}>
          <option value="todas">Todas</option>
          <option value="sem">Sem semana</option>
          {semanas.map((s: any) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>

      {tipos.length === 0 ? <EmptyState icon="🎨" text="Criando tipos padrão…" /> :
        filtrados.length === 0 ? (
          <EmptyState icon="📁" text="Nenhum projeto ainda. Crie o primeiro." />
        ) : view === "kanban" ? (
          <div className="grid md:grid-cols-4 gap-3">
            {PROJETO_STATUS.map((s) => (
              <div key={s.key} className="bg-bg-secondary rounded-xl p-3 border border-border">
                <div className="label-mono mb-3">{s.label}</div>
                <div className="space-y-2">
                  {filtrados.filter((p: any) => p.status === s.key).map((p: any) => (
                    <ProjetoCard key={p.id} p={p} onEdit={() => { setEditing(p); setOpen(true); }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {tipos.map((t: any) => {
              const list = porTipo[t.id] ?? [];
              if (list.length === 0) return null;
              return (
                <div key={t.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-3 h-3 rounded-full" style={{ background: t.cor ?? "#999" }} />
                    <div className="font-display text-lg">{t.nome}</div>
                    <span className="text-xs font-mono text-text-tertiary">({list.length})</span>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {list.map((p: any) => <ProjetoCard key={p.id} p={p} onEdit={() => { setEditing(p); setOpen(true); }} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {open && (
        <ProjetoModal
          uid={uid}
          editing={editing}
          tipos={tipos}
          semanas={semanas}
          intencoes={intencoes}
          onClose={() => setOpen(false)}
          onSaved={invalidate}
        />
      )}
    </div>
  );
}

function ProjetoCard({ p, onEdit }: any) {
  const st = PROJETO_STATUS.find((s) => s.key === p.status);
  return (
    <div className="bg-bg-primary border border-border rounded-xl p-4 hover:border-terracota transition">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link to="/atividades/projeto/$id" params={{ id: p.id }} className="font-display text-lg hover:text-terracota flex-1">
          {p.titulo}
        </Link>
        <button onClick={onEdit} className="text-xs font-mono text-text-tertiary hover:text-terracota">editar</button>
      </div>
      <div className="flex gap-1 flex-wrap mb-3">
        {st && <Tag color={st.color as any}>{st.label}</Tag>}
        {p.tipos_projeto && (
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-mono border" style={{ borderColor: p.tipos_projeto.cor, color: p.tipos_projeto.cor, background: `${p.tipos_projeto.cor}15` }}>
            {p.tipos_projeto.nome}
          </span>
        )}
      </div>
      <ProgressBar value={Number(p.percentual_conclusao)} max={100} rightLabel={`${Math.round(Number(p.percentual_conclusao))}%`} color={p.tipos_projeto?.cor ?? "var(--terracota)"} />
      <div className="flex justify-between text-xs font-mono text-text-tertiary mt-3">
        <span>{p.semanas?.nome ?? "sem semana"}</span>
        <span>{Number(p.horas_totais).toFixed(1)}h</span>
      </div>
    </div>
  );
}

function ProjetoModal({ uid, editing, tipos, semanas, intencoes, onClose, onSaved }: any) {
  const e = editing ?? {};
  const [titulo, setTitulo] = useState(e.titulo ?? "");
  const [descricao, setDescricao] = useState(e.descricao ?? "");
  const [tipoId, setTipoId] = useState(e.tipo_id ?? tipos[0]?.id ?? "");
  const [intencaoId, setIntencaoId] = useState(e.intencao_id ?? "");
  const [semanaId, setSemanaId] = useState(e.semana_id ?? "");
  const [status, setStatus] = useState(e.status ?? "planejamento");

  const save = async () => {
    if (!titulo.trim()) return toast.error("Título obrigatório");
    if (!tipoId) return toast.error("Tipo obrigatório");
    if (status === "ativo" && !semanaId) return toast.error("Projeto ativo exige uma semana");
    const payload: any = {
      titulo, descricao: descricao || null, tipo_id: tipoId,
      intencao_id: intencaoId || null, semana_id: semanaId || null, status,
    };
    if (editing?.id) {
      const { error } = await supabase.from("projetos").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("projetos").insert({ ...payload, user_id: uid });
      if (error) return toast.error(error.message);
    }
    toast.success(editing ? "Atualizado" : "Projeto criado");
    onSaved(); onClose();
  };

  const remove = async () => {
    if (!editing?.id || !confirm("Excluir projeto? Tarefas e registros de tempo vinculados também serão apagados.")) return;
    await supabase.from("projetos").delete().eq("id", editing.id);
    toast.success("Excluído");
    onSaved(); onClose();
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Editar projeto" : "Novo projeto"} wide>
      <Field label="Título *"><input className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus /></Field>
      <Field label="Descrição"><textarea className={inputCls} rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo *">
          <select className={inputCls} value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
            {tipos.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            {PROJETO_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>
        <Field label={`Semana ${status === "ativo" ? "*" : ""}`}>
          <select className={inputCls} value={semanaId} onChange={(e) => setSemanaId(e.target.value)}>
            <option value="">— nenhuma —</option>
            {semanas.map((s: any) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </Field>
        <Field label="Intenção (opcional)">
          <select className={inputCls} value={intencaoId} onChange={(e) => setIntencaoId(e.target.value)}>
            <option value="">— nenhuma —</option>
            {intencoes.map((i: any) => <option key={i.id} value={i.id}>{i.titulo}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex gap-2 justify-between mt-4">
        <div>{editing?.id && <Btn variant="danger" onClick={remove}>Excluir</Btn>}</div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={save}>Salvar</Btn>
        </div>
      </div>
    </Modal>
  );
}

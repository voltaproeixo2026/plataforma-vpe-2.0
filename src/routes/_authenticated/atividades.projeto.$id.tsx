import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Btn, Modal, Field, inputCls, EmptyState, ProgressBar } from "@/components/ui-custom";
import { PROJETO_STATUS, TAREFA_STATUS, formatDuracao } from "@/lib/atividades";
import { CheckCircle2, Circle, ChevronDown, ChevronRight, X, Clock, GripVertical, Repeat, Copy, Plus, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/_authenticated/atividades/projeto/$id")({
  component: ProjetoDetail,
});

function ProjetoDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [novaTarefa, setNovaTarefa] = useState("");
  const [horasOpen, setHorasOpen] = useState(false);
  const [expandida, setExpandida] = useState<Record<string, boolean>>({});

  const { data: p } = useQuery({
    queryKey: ["projeto", id],
    queryFn: async () => (await supabase.from("projetos").select("*, tipos_projeto(nome,cor), semanas(nome,data_inicio,data_fim), intencoes(titulo), projetos_recorrentes(id,titulo)").eq("id", id).maybeSingle()).data,
  });
  const { data: tarefas = [] } = useQuery({
    queryKey: ["tarefas_projeto", id],
    queryFn: async () => (await supabase.from("tarefas_projeto").select("*").eq("projeto_id", id).order("ordem").order("created_at")).data ?? [],
  });
  const { data: registros = [] } = useQuery({
    queryKey: ["registros_tempo", id],
    queryFn: async () => (await supabase.from("registros_tempo").select("*").eq("projeto_id", id).order("data", { ascending: false })).data ?? [],
  });
  const { data: historicoSemanas = [] } = useQuery({
    queryKey: ["projeto_semana_historico", id],
    queryFn: async () => (await supabase.from("projeto_semana_historico").select("id, data_transicao, semanas(nome)").eq("projeto_id", id).order("data_transicao", { ascending: true })).data ?? [],
  });
  const { data: semanasList = [] } = useQuery({
    queryKey: ["semanas-all-for-projeto", id],
    queryFn: async () => (await supabase.from("semanas").select("id, nome, data_inicio, data_fim").order("data_inicio", { ascending: false })).data ?? [],
  });

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["projeto", id] });
    qc.invalidateQueries({ queryKey: ["tarefas_projeto", id] });
    qc.invalidateQueries({ queryKey: ["registros_tempo", id] });
    qc.invalidateQueries({ queryKey: ["projeto_semana_historico", id] });
    qc.invalidateQueries({ queryKey: ["projetos"] });
  };

  const moverParaSemana = async (novaSemanaId: string) => {
    if (!novaSemanaId) return;
    const { error } = await supabase.from("projetos").update({ semana_id: novaSemanaId }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Projeto movido de semana");
    inv();
  };

  const raiz = useMemo(() => tarefas.filter((t: any) => !t.parent_id), [tarefas]);
  const filhasPor = useMemo(() => {
    const m: Record<string, any[]> = {};
    tarefas.forEach((t: any) => { if (t.parent_id) (m[t.parent_id] ||= []).push(t); });
    return m;
  }, [tarefas]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (!p) return <div className="text-text-tertiary">Carregando…</div>;

  const st = PROJETO_STATUS.find((s) => s.key === p.status);

  const addTarefa = async (parentId: string | null = null) => {
    const t = novaTarefa.trim();
    if (!t) return;
    const siblings = parentId ? (filhasPor[parentId] ?? []) : raiz;
    const ordem = siblings.length + 1;
    const { error } = await supabase.from("tarefas_projeto").insert({ user_id: p.user_id, projeto_id: id, titulo: t, parent_id: parentId, ordem });
    if (error) return toast.error(error.message);
    setNovaTarefa("");
    inv();
  };

  const addSubtarefa = async (parentId: string, titulo: string) => {
    const siblings = filhasPor[parentId] ?? [];
    const { error } = await supabase.from("tarefas_projeto").insert({ user_id: p.user_id, projeto_id: id, titulo, parent_id: parentId, ordem: siblings.length + 1 });
    if (error) return toast.error(error.message);
    inv();
  };

  const toggleTarefa = async (t: any) => {
    const novoStatus = t.status === "concluida" ? "a_fazer" : "concluida";
    await supabase.from("tarefas_projeto").update({ status: novoStatus }).eq("id", t.id);
    inv();
  };

  const updateTarefa = async (tid: string, patch: any) => {
    await supabase.from("tarefas_projeto").update(patch).eq("id", tid);
    inv();
  };

  const removeTarefa = async (tid: string) => {
    if (!confirm("Excluir tarefa (e suas subtarefas)?")) return;
    await supabase.from("tarefas_projeto").delete().eq("id", tid);
    inv();
  };


  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = raiz.findIndex((t: any) => t.id === active.id);
    const newIdx = raiz.findIndex((t: any) => t.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(raiz, oldIdx, newIdx);
    // otimista: atualiza ordem em batch
    await Promise.all(reordered.map((t: any, i: number) =>
      supabase.from("tarefas_projeto").update({ ordem: i + 1 }).eq("id", t.id),
    ));
    inv();
  };

  const copiarRecorrentes = async () => {
    const recs = tarefas.filter((t: any) => t.recorrente && !t.parent_id);
    if (recs.length === 0) return toast.error("Nenhuma tarefa recorrente marcada");
    const base = raiz.length;
    await Promise.all(recs.map(async (r: any, i: number) => {
      await supabase.from("tarefas_projeto").insert({
        user_id: p.user_id, projeto_id: id, titulo: r.titulo, descricao: r.descricao,
        ordem: base + i + 1,
      } as any);
    }));
    toast.success(`${recs.length} tarefa(s) recorrente(s) copiada(s)`);
    inv();
  };

  return (
    <div>
      <div className="mb-4">
        <Link to="/atividades" className="text-xs font-mono text-text-tertiary hover:text-terracota">← Projetos</Link>
      </div>
      <PageHeader title={p.titulo} subtitle={p.descricao ?? undefined}>
        <Btn variant="ghost" onClick={() => setHorasOpen(true)}><Clock size={14} className="inline mr-1" />+ registrar horas</Btn>
      </PageHeader>

      <div className="grid md:grid-cols-4 gap-3 mb-6">
        <MetricBox label="Status" value={st?.label ?? p.status} />
        <MetricBox label="Tipo" value={p.tipos_projeto?.nome ?? "—"} color={p.tipos_projeto?.cor} />
        <MetricBox label="Semana" value={p.semanas?.nome ?? "—"} />
        <MetricBox label="Tempo total" value={formatDuracao(registros.reduce((a: number, r: any) => a + Number(r.duracao_minutos ?? 0), 0))} />
      </div>

      <div className="bg-bg-primary border border-border rounded-xl p-5 mb-6">
        <div className="label-mono mb-2">Progresso</div>
        <ProgressBar value={Number(p.percentual_conclusao)} max={100} rightLabel={`${Math.round(Number(p.percentual_conclusao))}%`} color={p.tipos_projeto?.cor ?? "var(--terracota)"} />
        <div className="text-xs text-text-tertiary font-mono mt-2">
          {tarefas.filter((t: any) => t.status === "concluida" && !filhasPor[t.id]).length} de {tarefas.filter((t: any) => !filhasPor[t.id]).length} tarefas-folha concluídas
        </div>
      </div>

      <div className="bg-bg-primary border border-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="label-mono">Tarefas</div>
          <button onClick={copiarRecorrentes} className="text-xs font-mono text-text-tertiary hover:text-terracota flex items-center gap-1">
            <Copy size={12} /> copiar recorrentes
          </button>
        </div>
        <div className="flex gap-2 mb-4">
          <input className={inputCls} placeholder="Nova tarefa…" value={novaTarefa} onChange={(e) => setNovaTarefa(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTarefa(null)} />
          <Btn onClick={() => addTarefa(null)}>+</Btn>
        </div>
        {raiz.length === 0 ? <EmptyState icon="✍️" text="Adicione a primeira tarefa" /> : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={raiz.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {raiz.map((t: any) => (
                  <TarefaItem key={t.id} t={t} filhas={filhasPor[t.id] ?? []}
                    expandida={!!expandida[t.id]}
                    onToggleExp={() => setExpandida({ ...expandida, [t.id]: !expandida[t.id] })}
                    onToggle={toggleTarefa} onUpdate={updateTarefa} onRemove={removeTarefa} onAddSub={addSubtarefa}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="bg-bg-primary border border-border rounded-xl p-5">
        <div className="label-mono mb-3">Últimos lançamentos de tempo</div>
        {registros.length === 0 ? <EmptyState icon="⏱" text="Nenhum lançamento ainda" /> : (
          <ul className="divide-y divide-border">
            {registros.slice(0, 10).map((r: any) => (
              <li key={r.id} className="py-2 flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-text-tertiary w-20">{new Date(r.data + "T12:00").toLocaleDateString("pt-BR")}</span>
                <span className="font-mono font-semibold w-20">{formatDuracao(r.duracao_minutos)}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-secondary text-text-tertiary">{r.origem === "cronometro" ? "⏱" : "✍"}</span>
                <span className="flex-1 text-text-secondary">{r.observacao ?? "—"}</span>
                <button onClick={async () => { await supabase.from("registros_tempo").delete().eq("id", r.id); inv(); }} className="text-text-tertiary hover:text-[#e05c5c]"><X size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {horasOpen && <RegistroTempoModal projetoId={id} userId={p.user_id} onClose={() => setHorasOpen(false)} onSaved={inv} />}
    </div>
  );
}

function TarefaItem({ t, filhas, expandida, onToggleExp, onToggle, onUpdate, onRemove, onAddSub }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const done = t.status === "concluida";
  const [descricao, setDescricao] = useState(t.descricao ?? "");
  const [descDirty, setDescDirty] = useState(false);
  const [novaSub, setNovaSub] = useState("");

  useEffect(() => { setDescricao(t.descricao ?? ""); setDescDirty(false); }, [t.descricao]);

  const salvarDescricao = () => {
    onUpdate(t.id, { descricao: descricao.trim() || null });
    setDescDirty(false);
    toast.success("Descrição salva");
  };

  return (
    <li ref={setNodeRef} style={style} className="border border-border rounded-lg bg-bg-primary">
      <div className="flex items-center gap-2 p-3">
        <button {...attributes} {...listeners} className="text-text-tertiary hover:text-text-primary cursor-grab active:cursor-grabbing" aria-label="arrastar">
          <GripVertical size={14} />
        </button>
        <button onClick={() => onToggle(t)} className={done ? "text-sage" : "text-text-tertiary hover:text-sage"}>
          {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </button>
        <button onClick={onToggleExp} className="text-text-tertiary">
          {expandida ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <input
          className={`flex-1 bg-transparent focus:outline-none text-sm ${done ? "line-through text-text-tertiary" : ""}`}
          defaultValue={t.titulo}
          onBlur={(e) => e.target.value !== t.titulo && onUpdate(t.id, { titulo: e.target.value })}
        />
        {t.recorrente && <span title="Recorrente semanal" className="text-terracota"><Repeat size={12} /></span>}
        {t.data && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-terracota/10 text-terracota px-1.5 py-0.5 rounded" title="Data prevista">
            <CalendarDays size={11} />
            {new Date(t.data + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
          </span>
        )}

        {filhas.length > 0 && (
          <span className="text-[10px] font-mono text-text-tertiary bg-bg-secondary rounded px-1.5 py-0.5">
            {filhas.filter((f: any) => f.status === "concluida").length}/{filhas.length}
          </span>
        )}
        <select className="text-xs font-mono bg-bg-secondary border border-border rounded px-2 py-1" value={t.status} onChange={(e) => onUpdate(t.id, { status: e.target.value })}>
          {TAREFA_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <button onClick={() => onRemove(t.id)} className="text-text-tertiary hover:text-[#e05c5c]"><X size={14} /></button>
      </div>
      {expandida && (
        <div className="px-3 pb-3 pl-11 space-y-3">
          <div>
            <textarea
              className={inputCls + " text-sm"}
              rows={5}
              placeholder="Detalhamento — o que precisa acontecer aqui?"
              value={descricao}
              onChange={(e) => { setDescricao(e.target.value); setDescDirty(true); }}
            />
            <div className="flex gap-2 mt-1 justify-end">
              {descDirty && <span className="text-xs text-text-tertiary font-mono self-center">alterações não salvas</span>}
              <Btn variant="ghost" onClick={salvarDescricao} disabled={!descDirty}>Salvar descrição</Btn>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-mono text-text-secondary">
              <span>📅 Data prevista:</span>
              <input
                type="date"
                className="px-2 py-1 rounded bg-bg-secondary border border-border text-text-primary text-xs"
                value={t.data ?? ""}
                onChange={(e) => onUpdate(t.id, { data: e.target.value || null })}
              />
              {t.data && (
                <button
                  onClick={() => onUpdate(t.id, { data: null })}
                  className="text-text-tertiary hover:text-[#e05c5c]"
                  title="Remover data"
                ><X size={12} /></button>
              )}
              <span className="text-text-tertiary">(opcional — sem data = resolver ao longo da semana)</span>
            </label>
          </div>

          <label className="flex items-center gap-2 text-xs font-mono text-text-secondary">
            <input type="checkbox" checked={!!t.recorrente} onChange={(e) => onUpdate(t.id, { recorrente: e.target.checked, recorrencia_tipo: e.target.checked ? "semanal" : null })} />
            <Repeat size={12} /> repetir toda semana
          </label>


          {/* Subtarefas */}
          <div>
            <div className="label-mono mb-1">Subtarefas</div>
            {filhas.length > 0 && (
              <ul className="space-y-1 mb-2">
                {filhas.map((f: any) => (
                  <li key={f.id} className="flex items-center gap-2 text-sm">
                    <button onClick={() => onToggle(f)} className={f.status === "concluida" ? "text-sage" : "text-text-tertiary hover:text-sage"}>
                      {f.status === "concluida" ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    </button>
                    <input
                      className={`flex-1 bg-transparent focus:outline-none text-sm ${f.status === "concluida" ? "line-through text-text-tertiary" : ""}`}
                      defaultValue={f.titulo}
                      onBlur={(e) => e.target.value !== f.titulo && onUpdate(f.id, { titulo: e.target.value })}
                    />
                    <button onClick={() => onRemove(f.id)} className="text-text-tertiary hover:text-[#e05c5c]"><X size={12} /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input className={inputCls + " text-sm"} placeholder="Nova subtarefa…" value={novaSub} onChange={(e) => setNovaSub(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && novaSub.trim()) { onAddSub(t.id, novaSub.trim()); setNovaSub(""); } }} />
              <button onClick={() => { if (novaSub.trim()) { onAddSub(t.id, novaSub.trim()); setNovaSub(""); } }} className="px-2 rounded-lg bg-terracota text-bg-primary"><Plus size={14} /></button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color?: string | null }) {
  return (
    <div className="bg-bg-primary border border-border rounded-xl p-4 relative overflow-hidden">
      {color && <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: color }} />}
      <div className="label-mono">{label}</div>
      <div className="font-display text-lg mt-1">{value}</div>
    </div>
  );
}

function RegistroTempoModal({ projetoId, userId, onClose, onSaved }: any) {
  const [tab, setTab] = useState<"cronometro" | "manual">("manual");
  return (
    <Modal open onClose={onClose} title="Registrar tempo">
      <div className="flex gap-1 mb-4 border-b border-border">
        <button onClick={() => setTab("manual")} className={`px-3 py-2 text-sm font-mono border-b-2 ${tab === "manual" ? "border-terracota text-terracota" : "border-transparent text-text-tertiary"}`}>Manual</button>
        <button onClick={() => setTab("cronometro")} className={`px-3 py-2 text-sm font-mono border-b-2 ${tab === "cronometro" ? "border-terracota text-terracota" : "border-transparent text-text-tertiary"}`}>Cronômetro</button>
      </div>
      {tab === "manual"
        ? <ManualForm projetoId={projetoId} userId={userId} onClose={onClose} onSaved={onSaved} />
        : <CronometroForm projetoId={projetoId} userId={userId} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function ManualForm({ projetoId, userId, onClose, onSaved }: any) {
  const [horas, setHoras] = useState("0");
  const [minutos, setMinutos] = useState("30");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");

  const totalMin = Math.max(0, parseInt(horas || "0", 10) * 60 + parseInt(minutos || "0", 10));

  const save = async () => {
    if (totalMin <= 0) return toast.error("Informe horas e/ou minutos");
    const { error } = await supabase.from("registros_tempo").insert({
      user_id: userId, projeto_id: projetoId, duracao_minutos: totalMin, data, observacao: obs || null, origem: "manual",
    });
    if (error) return toast.error(error.message);
    toast.success("Tempo registrado");
    onSaved(); onClose();
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Horas"><input className={inputCls} type="number" min="0" value={horas} onChange={(e) => setHoras(e.target.value)} autoFocus /></Field>
        <Field label="Minutos"><input className={inputCls} type="number" min="0" max="59" value={minutos} onChange={(e) => setMinutos(e.target.value)} /></Field>
      </div>
      <div className="text-xs font-mono text-text-tertiary mb-3">Total: {formatDuracao(totalMin)}</div>
      <Field label="Data"><input type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} /></Field>
      <Field label="Observação"><textarea className={inputCls} rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></Field>
      <div className="flex gap-2 justify-end mt-4">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={save}>Salvar</Btn>
      </div>
    </>
  );
}

function CronometroForm({ projetoId, userId, onClose, onSaved }: any) {
  const storageKey = `cron_${projetoId}`;
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [accumulated, setAccumulated] = useState(0); // ms
  const [now, setNow] = useState(Date.now());
  const rafRef = useRef<number | null>(null);

  // restaurar do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const st = JSON.parse(raw);
        setRunning(!!st.running);
        setStartedAt(st.startedAt ?? null);
        setAccumulated(st.accumulated ?? 0);
      }
    } catch {}
  }, [storageKey]);

  // persistir
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ running, startedAt, accumulated }));
  }, [running, startedAt, accumulated, storageKey]);

  useEffect(() => {
    if (!running) return;
    const tick = () => { setNow(Date.now()); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const elapsedMs = accumulated + (running && startedAt ? now - startedAt : 0);
  const totalMinLive = Math.floor(elapsedMs / 60000);
  const [totalMinConfirm, setTotalMinConfirm] = useState<number | null>(null);
  const [obs, setObs] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));

  const iniciar = () => { setStartedAt(Date.now()); setRunning(true); };
  const pausar = () => {
    if (running && startedAt) { setAccumulated(accumulated + (Date.now() - startedAt)); setStartedAt(null); }
    setRunning(false);
  };
  const parar = () => {
    let total = accumulated;
    if (running && startedAt) total += Date.now() - startedAt;
    setRunning(false); setStartedAt(null); setAccumulated(total);
    setTotalMinConfirm(Math.max(1, Math.round(total / 60000)));
  };

  const salvar = async () => {
    if (!totalMinConfirm || totalMinConfirm <= 0) return toast.error("Tempo inválido");
    const { error } = await supabase.from("registros_tempo").insert({
      user_id: userId, projeto_id: projetoId, duracao_minutos: totalMinConfirm, data, observacao: obs || null, origem: "cronometro",
    });
    if (error) return toast.error(error.message);
    toast.success("Tempo cronometrado registrado");
    localStorage.removeItem(storageKey);
    onSaved(); onClose();
  };

  if (totalMinConfirm !== null) {
    const h = Math.floor(totalMinConfirm / 60);
    const m = totalMinConfirm % 60;
    return (
      <>
        <div className="text-center py-4">
          <div className="label-mono mb-2">Tempo cronometrado</div>
          <div className="font-display text-4xl">{formatDuracao(totalMinConfirm)}</div>
          <div className="text-xs text-text-tertiary font-mono mt-2">Ajuste antes de confirmar se necessário</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Horas"><input className={inputCls} type="number" min="0" value={h} onChange={(e) => setTotalMinConfirm(parseInt(e.target.value || "0", 10) * 60 + m)} /></Field>
          <Field label="Minutos"><input className={inputCls} type="number" min="0" max="59" value={m} onChange={(e) => setTotalMinConfirm(h * 60 + parseInt(e.target.value || "0", 10))} /></Field>
        </div>
        <Field label="Data"><input type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} /></Field>
        <Field label="Observação"><textarea className={inputCls} rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></Field>
        <div className="flex gap-2 justify-end mt-4">
          <Btn variant="ghost" onClick={() => setTotalMinConfirm(null)}>Voltar</Btn>
          <Btn onClick={salvar}>Confirmar e salvar</Btn>
        </div>
      </>
    );
  }

  return (
    <div className="text-center py-6">
      <div className="font-display text-5xl mb-6">{formatDuracao(totalMinLive)}</div>
      <div className="flex gap-2 justify-center">
        {!running && <Btn onClick={iniciar}>▶ Iniciar</Btn>}
        {running && <Btn variant="ghost" onClick={pausar}>⏸ Pausar</Btn>}
        <Btn variant="dark" onClick={parar} disabled={elapsedMs < 1000}>⏹ Parar</Btn>
      </div>
      <div className="text-xs text-text-tertiary font-mono mt-4">O cronômetro continua rodando mesmo se você fechar esta tela.</div>
    </div>
  );
}

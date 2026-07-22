import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Field, inputCls, Modal, EmptyState, ProgressBar } from "@/components/ui-custom";
import { fmtDateBR, addDays, todayISO, ensureActiveCiclo } from "@/lib/atividades";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";

const CICLO_SIZE = 12;

export function CicloManager({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [showGerar, setShowGerar] = useState(false);
  const [modoManual, setModoManual] = useState(false);
  const [showEncerrar, setShowEncerrar] = useState(false);
  const [reflexao, setReflexao] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoInicio, setNovoInicio] = useState("");
  const [novoFim, setNovoFim] = useState("");
  const [descanso, setDescanso] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState<string | null>(null);
  const [editSemana, setEditSemana] = useState<any | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editInicio, setEditInicio] = useState("");
  const [editFim, setEditFim] = useState("");
  const [editDescanso, setEditDescanso] = useState(false);

  const { data: ciclo } = useQuery({
    queryKey: ["ciclo-ativo", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ciclos")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "ativo")
        .order("created_at", { ascending: true })
        .limit(1);
      if (error) { console.error("[ciclo-ativo]", error); return null; }
      return data?.[0] ?? null;
    },
  });
  useEffect(() => {
    ensureActiveCiclo(userId).then((c) => {
      if (c) qc.invalidateQueries({ queryKey: ["ciclo-ativo", userId] });
    });
  }, [userId]);

  const cicloId = ciclo?.id;

  const { data: semanas = [] } = useQuery({
    queryKey: ["semanas", cicloId],
    queryFn: async () => {
      if (!cicloId) return [];
      const { data } = await supabase.from("semanas").select("*").eq("ciclo_id", cicloId).order("ordem_no_ciclo");
      return data || [];
    },
    enabled: !!cicloId,
  });

  const { data: concluidos = [] } = useQuery({
    queryKey: ["ciclos-concluidos", userId],
    queryFn: async () => {
      const { data } = await supabase.from("ciclos").select("*").eq("user_id", userId).eq("status", "concluido").order("data_fim", { ascending: false });
      return data || [];
    },
  });

  const openGerar = () => {
    const last = semanas[semanas.length - 1];
    const ordem = semanas.length + 1;
    setNovoNome(`Semana ${ordem}`);
    const inicio = last ? addDays(last.data_fim, 1) : (ciclo?.data_inicio || todayISO());
    setNovoInicio(inicio);
    setNovoFim(addDays(inicio, 6));
    setDescanso(false);
    setModoManual(false);
    setShowGerar(true);
  };

  const openManual = () => {
    setNovoNome(`Semana ${semanas.length + 1}`);
    setNovoInicio(ciclo?.data_inicio || todayISO());
    setNovoFim("");
    setDescanso(false);
    setModoManual(true);
    setShowGerar(true);
  };

  const gerar = async () => {
    if (!cicloId) return;
    if (semanas.length >= CICLO_SIZE) { toast.error("Ciclo já tem 12 semanas"); return; }
    if (!novoInicio || !novoFim) { toast.error("Informe início e fim"); return; }
    const { error } = await supabase.from("semanas").insert({
      user_id: userId, ciclo_id: cicloId, nome: novoNome,
      data_inicio: novoInicio, data_fim: novoFim,
      ordem_no_ciclo: semanas.length + 1, descanso, gerada_automaticamente: !modoManual,
    });
    if (error) return toast.error(error.message);
    setShowGerar(false);
    qc.invalidateQueries({ queryKey: ["semanas"] });
    toast.success("Semana criada");
  };

  const encerrar = async () => {
    if (!cicloId) return;
    const { error } = await supabase.from("ciclos").update({
      status: "concluido", data_fim: todayISO(), reflexao,
    }).eq("id", cicloId);
    if (error) return toast.error(error.message);
    // Criar próximo ciclo
    const { count } = await supabase.from("ciclos").select("id", { count: "exact", head: true }).eq("user_id", userId);
    await supabase.from("ciclos").insert({ user_id: userId, nome: `Ciclo ${(count || 0) + 1}`, data_inicio: todayISO(), status: "ativo" });
    setShowEncerrar(false); setReflexao("");
    qc.invalidateQueries();
    toast.success("Ciclo encerrado");
  };

  const podeEncerrar = semanas.length >= CICLO_SIZE;

  return (
    <div>
      <p className="text-sm text-text-secondary mb-4">
        Um ciclo é um bloco de <span className="font-mono">12 semanas</span> de execução focada, seguido de descanso e revisão.
        Cadastre a primeira semana manualmente e, a partir daí, gere as próximas em sequência. O progresso avança conforme as semanas são criadas dentro do ciclo (não pelo calendário civil).
      </p>
      {ciclo && (
        <div className="bg-dark text-bg-primary rounded-2xl p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="label-mono text-bg-tertiary/70">Ciclo atual</div>
              <div className="font-display text-2xl">{ciclo.nome}</div>
              <div className="text-xs font-mono text-bg-tertiary/70 mt-1">Início: {fmtDateBR(ciclo.data_inicio)}</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Btn variant="ghost" onClick={openManual} disabled={semanas.length >= CICLO_SIZE}>+ Nova semana</Btn>
              <Btn onClick={openGerar} disabled={semanas.length >= CICLO_SIZE}>+ Gerar próxima</Btn>
              {podeEncerrar && <Btn variant="danger" onClick={() => setShowEncerrar(true)}>Encerrar ciclo</Btn>}
            </div>
          </div>
          <div className="text-xs font-mono text-bg-tertiary/70 mb-2">Semana {semanas.length} de {CICLO_SIZE}</div>
          <ProgressBar value={semanas.length} max={CICLO_SIZE} color="var(--terracota)" />
        </div>
      )}

      <div className="bg-bg-primary border border-border rounded-xl p-5 mb-6">
        <div className="font-display text-xl mb-3">Semanas</div>
        {semanas.length === 0 ? <EmptyState icon="📅" text="Nenhuma semana. Gere a primeira." /> : (
          <ul className="space-y-2">
            {semanas.map(s => (
              <li key={s.id} className="flex items-center justify-between p-3 border border-border rounded-lg gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-text-primary truncate">{s.nome} {s.descanso && <span className="text-xs font-mono text-sage ml-2">descanso</span>}</div>
                  <div className="text-xs font-mono text-text-tertiary">{fmtDateBR(s.data_inicio)} → {fmtDateBR(s.data_fim)}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={async () => {
                    await supabase.from("semanas").update({ descanso: !s.descanso }).eq("id", s.id);
                    qc.invalidateQueries({ queryKey: ["semanas"] });
                  }} className="text-xs font-mono text-text-tertiary hover:text-text-primary">
                    {s.descanso ? "Marcar como normal" : "Marcar como descanso"}
                  </button>
                  <button
                    onClick={() => {
                      setEditSemana(s);
                      setEditNome(s.nome);
                      setEditInicio(s.data_inicio);
                      setEditFim(s.data_fim);
                      setEditDescanso(!!s.descanso);
                    }}
                    className="text-text-tertiary hover:text-text-primary"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Excluir "${s.nome}"? Registros de tempo vinculados perderão o vínculo com a semana.`)) return;
                      const { error } = await supabase.from("semanas").delete().eq("id", s.id);
                      if (error) return toast.error(error.message);
                      // Reordenar as semanas restantes
                      if (cicloId) {
                        const { data: restantes } = await supabase.from("semanas").select("id").eq("ciclo_id", cicloId).order("data_inicio");
                        if (restantes) {
                          await Promise.all(restantes.map((r, i) => supabase.from("semanas").update({ ordem_no_ciclo: i + 1 }).eq("id", r.id)));
                        }
                      }
                      if (restantes) {
                        await Promise.all(restantes.map((r, i) => supabase.from("semanas").update({ ordem_no_ciclo: i + 1 }).eq("id", r.id)));
                      }
                      qc.invalidateQueries({ queryKey: ["semanas"] });
                      toast.success("Semana excluída");
                    }}
                    className="text-text-tertiary hover:text-red-500"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {concluidos.length > 0 && (
        <div className="bg-bg-primary border border-border rounded-xl p-5">
          <div className="font-display text-xl mb-3">Histórico</div>
          <ul className="space-y-2">
            {concluidos.map(c => (
              <li key={c.id} className="border border-border rounded-lg">
                <button onClick={() => setHistoricoOpen(historicoOpen === c.id ? null : c.id)} className="w-full flex items-center justify-between p-3">
                  <div className="text-left">
                    <div className="font-medium">{c.nome}</div>
                    <div className="text-xs font-mono text-text-tertiary">{fmtDateBR(c.data_inicio)} → {fmtDateBR(c.data_fim)}</div>
                  </div>
                  {historicoOpen === c.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {historicoOpen === c.id && <CicloResumo cicloId={c.id} reflexao={c.reflexao} />}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal open={showGerar} onClose={() => setShowGerar(false)} title={modoManual ? "Nova semana" : "Gerar próxima semana"}>
        <Field label="Nome"><input className={inputCls} value={novoNome} onChange={e => setNovoNome(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início"><input type="date" className={inputCls} value={novoInicio} onChange={e => setNovoInicio(e.target.value)} /></Field>
          <Field label="Fim"><input type="date" className={inputCls} value={novoFim} onChange={e => setNovoFim(e.target.value)} /></Field>
        </div>
        <label className="flex items-center gap-2 mb-3 text-sm">
          <input type="checkbox" checked={descanso} onChange={e => setDescanso(e.target.checked)} /> Marcar como semana de descanso
        </label>
        <div className="flex gap-2 justify-end"><Btn variant="ghost" onClick={() => setShowGerar(false)}>Cancelar</Btn><Btn onClick={gerar}>Confirmar</Btn></div>
      </Modal>

      <Modal open={showEncerrar} onClose={() => setShowEncerrar(false)} title="Encerrar ciclo" wide>
        {cicloId && <CicloResumo cicloId={cicloId} />}
        <Field label="Reflexão sobre este ciclo">
          <textarea className={inputCls} rows={5} value={reflexao} onChange={e => setReflexao(e.target.value)} placeholder="O que funcionou? O que aprendi?" />
        </Field>
        <div className="flex gap-2 justify-end"><Btn variant="ghost" onClick={() => setShowEncerrar(false)}>Cancelar</Btn><Btn variant="danger" onClick={encerrar}>Encerrar ciclo</Btn></div>
      </Modal>
    </div>
  );
}

function CicloResumo({ cicloId, reflexao }: { cicloId: string; reflexao?: string | null }) {
  const { data } = useQuery({
    queryKey: ["ciclo-resumo", cicloId],
    queryFn: async () => {
      const { data: semanas } = await supabase.from("semanas").select("id").eq("ciclo_id", cicloId);
      const semIds = (semanas || []).map(s => s.id);
      if (semIds.length === 0) return { concl: 0, canc: 0, and: 0, byTipo: [] as { nome: string; horas: number }[] };
      const { data: projetos } = await supabase.from("projetos").select("id, status, tipo_id, tipos_projeto(nome)").in("semana_id", semIds);
      const p = projetos || [];
      const concl = p.filter((x: any) => x.status === "concluido").length;
      const canc = p.filter((x: any) => x.status === "cancelado").length;
      const and = p.filter((x: any) => x.status === "ativo" || x.status === "planejamento").length;
      const projIds = p.map((x: any) => x.id);
      let byTipo: { nome: string; horas: number }[] = [];
      if (projIds.length) {
        const { data: rt } = await supabase.from("registros_tempo").select("duracao_minutos, tipos_projeto(nome)").in("projeto_id", projIds);
        const agg = new Map<string, number>();
        (rt || []).forEach((r: any) => {
          const nome = r.tipos_projeto?.nome || "—";
          agg.set(nome, (agg.get(nome) || 0) + (r.duracao_minutos || 0));
        });
        byTipo = Array.from(agg.entries()).map(([nome, mins]) => ({ nome, horas: Math.round(mins / 6) / 10 }));
      }
      return { concl, and, canc, byTipo };
    },
  });
  if (!data) return <div className="p-3 text-sm text-text-tertiary">Carregando...</div>;
  return (
    <div className="p-3 grid gap-3 md:grid-cols-2 text-sm">
      <div><div className="label-mono">Projetos</div>{data.concl} concluídos · {data.canc} cancelados · {data.and} em andamento</div>
      <div className="md:col-span-2">
        <div className="label-mono mb-1">Horas por tipo</div>
        {data.byTipo.length === 0 ? <div className="text-text-tertiary text-xs">Sem registros</div> :
          <ul className="text-xs font-mono space-y-1">{data.byTipo.map(t => <li key={t.nome}>{t.nome} — {t.horas}h</li>)}</ul>}
      </div>
      {reflexao && <div className="md:col-span-2"><div className="label-mono">Reflexão</div><div className="whitespace-pre-wrap text-sm">{reflexao}</div></div>}
    </div>
  );
}

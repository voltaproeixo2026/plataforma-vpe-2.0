import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, Btn, Modal, Field, inputCls, EmptyState, Tag } from "@/components/ui-custom";
import { toast } from "sonner";
import { Repeat, Pause, Play, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { fmtHoras } from "@/lib/atividades";

export const Route = createFileRoute("/_authenticated/atividades/recorrentes")({
  head: () => ({ meta: [{ title: "Projetos recorrentes — Volta Pro Eixo" }] }),
  component: RecorrentesPage,
});

function RecorrentesPage() {
  const { user } = useAuth();
  if (!user) return null;
  const uid = user.id;
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ titulo: "", descricao: "", tipo_id: "", intencao_id: "", frequencia: "semanal", ativo: true });

  const { data: tipos = [] } = useQuery({
    queryKey: ["tipos", uid],
    queryFn: async () => (await supabase.from("tipos_projeto").select("id, nome, cor").eq("user_id", uid).order("nome")).data ?? [],
  });
  const { data: intencoes = [] } = useQuery({
    queryKey: ["intencoes-all", uid],
    queryFn: async () => (await supabase.from("intencoes").select("id, titulo").eq("user_id", uid).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: recorrentes = [] } = useQuery({
    queryKey: ["projetos_recorrentes", uid],
    queryFn: async () => (await supabase
      .from("projetos_recorrentes")
      .select("*, tipos_projeto(nome, cor), intencoes(titulo)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })).data ?? [],
  });

  const salvar = async () => {
    if (!form.titulo?.trim()) return toast.error("Título obrigatório");
    if (!form.tipo_id) return toast.error("Tipo obrigatório");
    const { error } = await supabase.from("projetos_recorrentes").insert({
      user_id: uid,
      titulo: form.titulo.trim(),
      descricao: form.descricao || null,
      tipo_id: form.tipo_id,
      intencao_id: form.intencao_id || null,
      frequencia: form.frequencia,
      ativo: true,
    });
    if (error) return toast.error(error.message);
    setOpen(false);
    setForm({ titulo: "", descricao: "", tipo_id: "", intencao_id: "", frequencia: "semanal", ativo: true });
    qc.invalidateQueries({ queryKey: ["projetos_recorrentes", uid] });
    toast.success("Modelo criado. A próxima semana já gera instância automaticamente.");
  };

  const togglePause = async (id: string, ativo: boolean) => {
    const { error } = await supabase.from("projetos_recorrentes").update({ ativo: !ativo }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["projetos_recorrentes", uid] });
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir modelo recorrente? As instâncias já geradas continuam existindo.")) return;
    const { error } = await supabase.from("projetos_recorrentes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["projetos_recorrentes", uid] });
  };

  return (
    <div>
      <PageHeader
        title="Projetos recorrentes"
        subtitle="Modelos que geram automaticamente uma instância a cada nova semana. Cada instância tem tarefas, horas e % de conclusão isolados."
      >
        <Btn onClick={() => setOpen(true)}>+ Novo modelo</Btn>
      </PageHeader>

      {recorrentes.length === 0 ? (
        <EmptyState icon="🔁" text="Nenhum projeto recorrente. Crie um modelo para que ele apareça em toda semana nova." />
      ) : (
        <ul className="space-y-3">
          {recorrentes.map((r: any) => (
            <RecorrenteCard
              key={r.id}
              r={r}
              expanded={expanded === r.id}
              onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
              onPause={() => togglePause(r.id, r.ativo)}
              onDelete={() => excluir(r.id)}
            />
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo projeto recorrente">
        <Field label="Título"><input className={inputCls} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Mentoria Individual" /></Field>
        <Field label="Descrição"><textarea className={inputCls} rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo *">
            <select className={inputCls} value={form.tipo_id} onChange={(e) => setForm({ ...form, tipo_id: e.target.value })}>
              <option value="">—</option>
              {tipos.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </Field>
          <Field label="Intenção">
            <select className={inputCls} value={form.intencao_id} onChange={(e) => setForm({ ...form, intencao_id: e.target.value })}>
              <option value="">—</option>
              {intencoes.map((i: any) => <option key={i.id} value={i.id}>{i.titulo}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex gap-2 justify-end">
          <Btn variant="ghost" onClick={() => setOpen(false)}>Cancelar</Btn>
          <Btn onClick={salvar}>Criar</Btn>
        </div>
      </Modal>
    </div>
  );
}

function RecorrenteCard({ r, expanded, onToggle, onPause, onDelete }: any) {
  const { data: instancias = [] } = useQuery({
    queryKey: ["recorrente-instancias", r.id],
    queryFn: async () => (await supabase
      .from("projetos")
      .select("id, titulo, status, percentual_conclusao, horas_totais, semanas(nome, data_inicio)")
      .eq("projeto_recorrente_id", r.id)
      .order("created_at", { ascending: false })).data ?? [],
    enabled: expanded,
  });

  const agregados = useMemo(() => {
    if (!expanded || instancias.length === 0) return null;
    const totalHoras = instancias.reduce((a: number, i: any) => a + Number(i.horas_totais ?? 0), 0);
    const finalizadas = instancias.filter((i: any) => Number(i.percentual_conclusao) >= 100);
    const mediaPct = instancias.reduce((a: number, i: any) => a + Number(i.percentual_conclusao ?? 0), 0) / instancias.length;
    return { totalHoras, finalizadas: finalizadas.length, mediaPct, total: instancias.length };
  }, [instancias, expanded]);

  return (
    <li className="bg-bg-primary border border-border rounded-xl">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Repeat size={14} className="text-terracota" />
            <span className="font-medium text-text-primary truncate">{r.titulo}</span>
            {!r.ativo && <Tag>pausado</Tag>}
            {r.tipos_projeto?.nome && <Tag>{r.tipos_projeto.nome}</Tag>}
          </div>
          {r.descricao && <div className="text-xs text-text-tertiary mt-1">{r.descricao}</div>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onPause} className="text-text-tertiary hover:text-text-primary" title={r.ativo ? "Pausar" : "Retomar"}>
            {r.ativo ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={onDelete} className="text-text-tertiary hover:text-red-500" title="Excluir">
            <Trash2 size={16} />
          </button>
          <button onClick={onToggle} className="text-text-tertiary hover:text-text-primary" title="Ver instâncias">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border p-4">
          {agregados && (
            <div className="grid grid-cols-3 gap-3 mb-4 text-sm font-mono">
              <div><div className="label-mono">Total horas</div>{fmtHoras(agregados.totalHoras)}</div>
              <div><div className="label-mono">Média conclusão</div>{Math.round(agregados.mediaPct)}%</div>
              <div><div className="label-mono">Semanas 100%</div>{agregados.finalizadas} / {agregados.total}</div>
            </div>
          )}
          {instancias.length === 0 ? (
            <div className="text-xs text-text-tertiary font-mono">Nenhuma instância ainda. Ao criar uma nova semana, uma será gerada automaticamente.</div>
          ) : (
            <ul className="space-y-1">
              {instancias.map((i: any) => (
                <li key={i.id}>
                  <Link
                    to="/atividades/projeto/$id"
                    params={{ id: i.id }}
                    className="flex items-center justify-between p-2 rounded hover:bg-bg-secondary text-sm"
                  >
                    <span className="truncate">{i.semanas?.nome ?? "—"} · {i.titulo}</span>
                    <span className="font-mono text-xs text-text-tertiary shrink-0 ml-2">
                      {Math.round(Number(i.percentual_conclusao))}% · {fmtHoras(Number(i.horas_totais))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

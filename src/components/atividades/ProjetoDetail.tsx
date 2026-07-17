import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Btn, EmptyState } from "@/components/ui-custom";
import { fmtHoras, fmtDateBR } from "@/lib/atividades";
import { ArrowLeft, Trash2, Clock } from "lucide-react";
import { RegistrarHorasModal } from "./RegistrarHorasModal";

export function ProjetoDetail({ projetoId, userId, onBack }: { projetoId: string; userId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [showHoras, setShowHoras] = useState(false);

  const projetoQ = useQuery({
    queryKey: ["projeto", projetoId],
    queryFn: async () => (await supabase.from("projetos").select("*, tipos_projeto(nome, cor), semanas(nome), intencoes(titulo)").eq("id", projetoId).maybeSingle()).data,
  });

  const registrosQ = useQuery({
    queryKey: ["registros", projetoId],
    queryFn: async () => (await supabase.from("registros_tempo").select("*").eq("projeto_id", projetoId).order("data", { ascending: false })).data || [],
  });

  const projeto = projetoQ.data;
  const registros = registrosQ.data || [];

  const removeRegistro = async (id: string) => {
    if (!confirm("Excluir registro?")) return;
    await supabase.from("registros_tempo").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["registros", projetoId] });
    qc.invalidateQueries({ queryKey: ["projeto", projetoId] });
    qc.invalidateQueries({ queryKey: ["projetos"] });
  };

  if (projetoQ.isLoading) return <div className="text-text-tertiary font-mono text-sm">Carregando...</div>;
  if (!projeto) return <div><Btn variant="ghost" onClick={onBack}>← Voltar</Btn><div className="mt-4">Projeto não encontrado</div></div>;

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
        <div className="mt-4">
          <div className="label-mono mb-1">Tempo dedicado</div>
          <div className="font-mono text-2xl text-text-primary">{fmtHoras(Number(projeto.horas_totais))}</div>
        </div>
        <div className="mt-4"><Btn onClick={() => setShowHoras(true)}><Clock size={14} className="inline mr-1" /> + registrar horas</Btn></div>
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
    </div>
  );
}

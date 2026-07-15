import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Modal, Field, inputCls, Btn } from "@/components/ui-custom";
import { Play, Pause, Square } from "lucide-react";
import { todayISO } from "@/lib/atividades";
import { toast } from "sonner";

type Props = { open: boolean; onClose: () => void; projetoId: string; userId: string; onSaved: () => void };

const LS_KEY = (pid: string) => `crono:${pid}`;

type CronoState = { startedAt: number; accumulated: number; running: boolean };

export function RegistrarHorasModal({ open, onClose, projetoId, userId, onSaved }: Props) {
  const [tab, setTab] = useState<"crono" | "manual">("crono");
  const [horas, setHoras] = useState(0);
  const [minutos, setMinutos] = useState(0);
  const [obs, setObs] = useState("");
  const [data, setData] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  const [crono, setCrono] = useState<CronoState>({ startedAt: 0, accumulated: 0, running: false });
  const [now, setNow] = useState(Date.now());
  const [confirming, setConfirming] = useState(false);
  const [ajusteMin, setAjusteMin] = useState(0);
  const tickRef = useRef<number | null>(null);

  // load state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY(projetoId));
      if (raw) setCrono(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [projetoId]);

  useEffect(() => {
    localStorage.setItem(LS_KEY(projetoId), JSON.stringify(crono));
  }, [crono, projetoId]);

  useEffect(() => {
    if (crono.running) {
      tickRef.current = window.setInterval(() => setNow(Date.now()), 1000);
      return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
    }
  }, [crono.running]);

  const elapsedMs = crono.accumulated + (crono.running ? now - crono.startedAt : 0);
  const elapsedMin = Math.floor(elapsedMs / 60000);
  const hh = Math.floor(elapsedMin / 60);
  const mm = elapsedMin % 60;
  const ss = Math.floor((elapsedMs / 1000) % 60);

  const start = () => setCrono(c => ({ ...c, startedAt: Date.now(), running: true }));
  const pause = () => setCrono(c => ({ ...c, accumulated: c.accumulated + (Date.now() - c.startedAt), running: false }));
  const stop = () => {
    const total = crono.accumulated + (crono.running ? Date.now() - crono.startedAt : 0);
    setAjusteMin(Math.max(1, Math.round(total / 60000)));
    setCrono({ startedAt: 0, accumulated: total, running: false });
    setConfirming(true);
  };

  const salvarCrono = async () => {
    if (ajusteMin <= 0) return;
    setSaving(true);
    const { error } = await supabase.from("registros_tempo").insert({
      user_id: userId, projeto_id: projetoId,
      data, duracao_minutos: ajusteMin, origem: "cronometro", observacao: obs || null,
    });
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    localStorage.removeItem(LS_KEY(projetoId));
    setCrono({ startedAt: 0, accumulated: 0, running: false });
    setConfirming(false); setObs(""); setAjusteMin(0);
    onSaved(); onClose();
  };

  const salvarManual = async () => {
    const total = (horas || 0) * 60 + (minutos || 0);
    if (total <= 0) { toast({ title: "Informe horas ou minutos", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("registros_tempo").insert({
      user_id: userId, projeto_id: projetoId, data,
      duracao_minutos: total, origem: "manual", observacao: obs || null,
    });
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setHoras(0); setMinutos(0); setObs("");
    onSaved(); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar horas" wide>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("crono")} className={`px-3 py-1.5 rounded-lg text-sm font-mono ${tab==="crono"?"bg-terracota text-bg-primary":"bg-bg-secondary"}`}>Cronômetro</button>
        <button onClick={() => setTab("manual")} className={`px-3 py-1.5 rounded-lg text-sm font-mono ${tab==="manual"?"bg-terracota text-bg-primary":"bg-bg-secondary"}`}>Manual</button>
      </div>

      {tab === "crono" && !confirming && (
        <div className="text-center py-4">
          <div className="font-mono text-5xl text-text-primary mb-6">
            {String(hh).padStart(2,"0")}:{String(mm).padStart(2,"0")}:{String(ss).padStart(2,"0")}
          </div>
          <div className="flex justify-center gap-3">
            {!crono.running ? (
              <Btn onClick={start}><Play size={14} className="inline mr-1" /> Iniciar</Btn>
            ) : (
              <Btn onClick={pause} variant="ghost"><Pause size={14} className="inline mr-1" /> Pausar</Btn>
            )}
            <Btn onClick={stop} variant="dark" disabled={elapsedMs === 0}><Square size={14} className="inline mr-1" /> Parar</Btn>
          </div>
          <div className="text-xs text-text-tertiary mt-4 font-mono">O cronômetro continua rodando mesmo se você fechar esta tela.</div>
        </div>
      )}

      {tab === "crono" && confirming && (
        <div>
          <Field label="Duração (minutos)"><input type="number" min={1} value={ajusteMin} onChange={e => setAjusteMin(parseInt(e.target.value) || 0)} className={inputCls} /></Field>
          <Field label="Data"><input type="date" value={data} onChange={e => setData(e.target.value)} className={inputCls} /></Field>
          <Field label="Observação"><textarea value={obs} onChange={e => setObs(e.target.value)} className={inputCls} rows={2} /></Field>
          <div className="flex gap-2 justify-end">
            <Btn variant="ghost" onClick={() => setConfirming(false)}>Voltar</Btn>
            <Btn onClick={salvarCrono} disabled={saving}>Salvar</Btn>
          </div>
        </div>
      )}

      {tab === "manual" && (
        <div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Horas"><input type="number" min={0} value={horas} onChange={e => setHoras(parseInt(e.target.value) || 0)} className={inputCls} /></Field>
            <Field label="Minutos"><input type="number" min={0} max={59} value={minutos} onChange={e => setMinutos(parseInt(e.target.value) || 0)} className={inputCls} /></Field>
          </div>
          <Field label="Data"><input type="date" value={data} onChange={e => setData(e.target.value)} className={inputCls} /></Field>
          <Field label="Observação"><textarea value={obs} onChange={e => setObs(e.target.value)} className={inputCls} rows={2} /></Field>
          <div className="flex gap-2 justify-end">
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn onClick={salvarManual} disabled={saving}>Salvar</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

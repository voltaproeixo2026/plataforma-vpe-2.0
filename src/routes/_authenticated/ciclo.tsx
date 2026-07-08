import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, SectionTitle } from "@/components/ui-custom";
import { cycleDayFromStart } from "@/utils/cyclePhase";
import { PhaseCards } from "@/components/PhaseCards";
import { CycleEvolutionChart } from "@/components/CycleEvolutionChart";
import { todayISO } from "@/lib/biz";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ciclo")({
  head: () => ({ meta: [{ title: "Ciclo — Painel" }] }),
  component: CicloPage,
});

function CicloPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();

  const [cycleLength, setCycleLength] = useState(28);
  const [lastStart, setLastStart] = useState("");
  const [historyDays, setHistoryDays] = useState(30);
  const [emotionScale, setEmotionScale] = useState(5);
  const [keyword, setKeyword] = useState("");
  const [creativity, setCreativity] = useState(5);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingStart, setSavingStart] = useState(false);
  const [entryDate, setEntryDate] = useState(todayISO());

  const periodOptions = [7, 30, 90, 180, 365];

  const { data: profile } = useQuery({
    queryKey: ["profile-cycle", uid],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("last_cycle_start, cycle_length").eq("id", uid).maybeSingle();
      if (data?.last_cycle_start) setLastStart(data.last_cycle_start);
      if (data?.cycle_length) setCycleLength(data.cycle_length);
      return data;
    },
  });

  const cycleDay = useMemo(
    () => (profile?.last_cycle_start ? cycleDayFromStart(profile.last_cycle_start, new Date(), cycleLength) : null),
    [profile?.last_cycle_start, cycleLength]
  );

  useQuery({
    queryKey: ["cycle-entry", uid, entryDate],
    queryFn: async () => {
      const { data } = await supabase.from("cycle_entries").select("*").eq("date", entryDate).maybeSingle();
      if (data) {
        setEmotionScale(data.emotion_scale ?? 5);
        setKeyword(data.keyword ?? "");
        setCreativity(data.creativity ?? 5);
        setNote(data.note ?? "");
      } else {
        setEmotionScale(5); setKeyword(""); setCreativity(5); setNote("");
      }
      return data;
    },
  });

  const saveStart = async () => {
    if (!lastStart) return;
    setSavingStart(true);
    const { error } = await supabase.from("profiles").update({ last_cycle_start: lastStart, cycle_length: cycleLength }).eq("id", uid);
    setSavingStart(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Ciclo configurado");
      qc.invalidateQueries({ queryKey: ["profile-cycle", uid] });
      qc.invalidateQueries({ queryKey: ["profile", uid] });
    }
  };

  const save = async () => {
    setSaving(true);
    const dayForEntry = profile?.last_cycle_start
      ? cycleDayFromStart(profile.last_cycle_start, new Date(entryDate + "T12:00:00"), cycleLength) : 1;
    const payload = {
      user_id: uid, date: entryDate, cycle_day: dayForEntry, cycle_length: cycleLength,
      emotion_scale: emotionScale, keyword: keyword || null, creativity, note,
    };
    const { error } = await supabase.from("cycle_entries").upsert(payload, { onConflict: "user_id,date" });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Registro salvo"); qc.invalidateQueries({ queryKey: ["cycle-entry"] }); }
  };

  return (
    <div>
      <PageHeader title="Ciclo 🌙" subtitle="Lua, ciclo e o que se move por dentro" />

      <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <SectionTitle>Evolução do ciclo</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {periodOptions.map((d) => (
              <button
                key={d}
                onClick={() => setHistoryDays(d)}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs border transition-colors ${
                  historyDays === d
                    ? "bg-terracota border-terracota text-bg-primary"
                    : "border-border hover:border-terracota/60 text-text-secondary"
                }`}
              >
                {d} dias
              </button>
            ))}
          </div>
        </div>
        <CycleEvolutionChart
          userId={uid}
          days={historyDays}
          lastCycleStart={profile?.last_cycle_start ?? null}
          cycleLength={cycleLength}
        />
      </div>

      <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
        <SectionTitle>Configuração</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-mono">Último início</label>
            <input type="date" value={lastStart} onChange={(e) => setLastStart(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-primary border border-border" />
          </div>
          <div>
            <label className="label-mono">Duração (dias)</label>
            <input type="number" min={20} max={45} value={cycleLength}
              onChange={(e) => setCycleLength(Math.max(20, Math.min(45, Number(e.target.value) || 28)))}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-primary border border-border" />
          </div>
        </div>
        <button onClick={saveStart} disabled={!lastStart || savingStart}
          className="mt-3 px-4 py-2 rounded-lg bg-terracota hover:bg-terracota-light text-bg-primary font-mono text-sm disabled:opacity-60">
          {savingStart ? "Salvando..." : "Salvar configuração"}
        </button>
      </div>

      <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
        <SectionTitle>Data do registro</SectionTitle>
        <input type="date" value={entryDate} max={todayISO()} onChange={(e) => setEntryDate(e.target.value)}
          className="px-3 py-2 rounded-lg bg-bg-primary border border-border" />
      </div>

      <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
        <SectionTitle>Emoção do dia</SectionTitle>
        <div className="flex items-center gap-6">
          <div className="font-display text-5xl text-sage min-w-[3rem] text-center">{emotionScale}</div>
          <div className="flex-1">
            <input type="range" min={1} max={10} value={emotionScale} onChange={(e) => setEmotionScale(Number(e.target.value))} className="w-full accent-[var(--sage)]" />
            <div className="flex justify-between text-xs font-mono text-text-tertiary mt-1"><span>Pesada</span><span>Plena</span></div>
          </div>
        </div>
        <div className="mt-4">
          <label className="label-mono">Palavra-chave do dia</label>
          <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-primary border border-border" />
        </div>
      </div>

      <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
        <SectionTitle>Criatividade</SectionTitle>
        <div className="flex items-center gap-6">
          <div className="font-display text-5xl text-terracota min-w-[3rem] text-center">{creativity}</div>
          <div className="flex-1">
            <input type="range" min={1} max={10} value={creativity} onChange={(e) => setCreativity(Number(e.target.value))} className="w-full accent-[var(--terracota)]" />
            <div className="flex justify-between text-xs font-mono text-text-tertiary mt-1"><span>Apagada</span><span>Em chamas</span></div>
          </div>
        </div>
      </div>

      <div className="bg-bg-secondary border border-border rounded-2xl p-6">
        <SectionTitle>Diário</SectionTitle>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5}
          placeholder="O que está no seu coração hoje?"
          className="w-full px-4 py-3 rounded-lg bg-bg-primary border border-border resize-none" />
        <button onClick={save} disabled={saving}
          className="mt-4 px-5 py-2.5 rounded-lg bg-terracota hover:bg-terracota-light text-bg-primary font-mono text-sm disabled:opacity-60">
          {saving ? "Salvando..." : "Salvar registro"}
        </button>
      </div>
    </div>
  );
}

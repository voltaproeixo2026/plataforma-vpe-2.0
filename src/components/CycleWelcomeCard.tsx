import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cycleDayFromStart } from "@/utils/cyclePhase";
import { PhaseCards } from "@/components/PhaseCards";
import { toast } from "sonner";

export function CycleWelcomeCard({ uid }: { uid: string }) {
  const qc = useQueryClient();
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", uid],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("last_cycle_start, cycle_length").eq("id", uid).maybeSingle();
      return data;
    },
  });

  const save = async () => {
    if (!startDate) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ last_cycle_start: startDate }).eq("id", uid);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Ciclo atualizado");
      qc.invalidateQueries({ queryKey: ["profile", uid] });
    }
  };

  if (isLoading) return null;

  const day = profile?.last_cycle_start
    ? cycleDayFromStart(profile.last_cycle_start, new Date(), profile.cycle_length ?? 28)
    : null;

  if (!profile?.last_cycle_start) {
    return (
      <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🌙</div>
          <div className="flex-1">
            <div className="font-display text-xl text-text-primary">Conecte-se ao seu ciclo (opcional)</div>
            <div className="text-sm text-text-secondary mt-1">
              Quando começou seu último ciclo? Configure uma vez para ver a fase automaticamente.
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 rounded-lg bg-bg-primary border border-border text-text-primary focus:outline-none focus:border-terracota text-sm" />
              <button onClick={save} disabled={!startDate || saving}
                className="px-4 py-2 rounded-lg bg-terracota hover:bg-terracota-light text-bg-primary font-mono text-sm transition disabled:opacity-60">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <Link to="/ciclo" className="block hover:opacity-95 transition">
        <PhaseCards cycleDay={day ?? undefined} cycleLength={profile.cycle_length ?? 28} />
      </Link>
    </div>
  );
}

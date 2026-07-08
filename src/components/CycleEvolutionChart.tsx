import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { SectionTitle } from "@/components/ui-custom";
import { cycleDayFromStart, getCyclePhaseForDay } from "@/utils/cyclePhase";

type Props = {
  userId: string;
  days?: number;
  lastCycleStart?: string | null;
  cycleLength?: number;
};

export function CycleEvolutionChart({ userId, days = 30, lastCycleStart, cycleLength = 28 }: Props) {
  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1));
    return d.toISOString().slice(0, 10);
  }, [days]);

  const { data: entries = [] } = useQuery({
    queryKey: ["cycle-entries-range", userId, startDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycle_entries")
        .select("date, emotion_scale, creativity")
        .eq("user_id", userId)
        .gte("date", startDate)
        .order("date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const chartData = useMemo(() => {
    const map = new Map(entries.map((e: any) => [e.date, e]));
    const out: Array<{ date: string; label: string; emotion: number | null; creativity: number | null; phase?: string }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate + "T12:00:00");
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const e = map.get(iso) as any;
      const item: any = {
        date: iso,
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        emotion: e?.emotion_scale ?? null,
        creativity: e?.creativity ?? null,
      };
      if (lastCycleStart) {
        const day = cycleDayFromStart(lastCycleStart, d, cycleLength);
        item.phase = getCyclePhaseForDay(day, cycleLength).name;
      }
      out.push(item);
    }
    return out;
  }, [entries, days, startDate, lastCycleStart, cycleLength]);

  const phaseChanges = useMemo(() => {
    const changes: Array<{ label: string; phase: string; color: string }> = [];
    let prev: string | null = null;
    for (const p of chartData) {
      if (p.phase && p.phase !== prev) {
        const info = getCyclePhaseForDay(1, cycleLength);
        // get color/emoji for the phase name
        const sample = [1, 6, 14, 17].map(d => getCyclePhaseForDay(d, cycleLength)).find(x => x.name === p.phase) ?? info;
        changes.push({ label: p.label, phase: p.phase, color: sample.color });
        prev = p.phase;
      }
    }
    return changes;
  }, [chartData, cycleLength]);

  const hasAny = chartData.some(d => d.emotion !== null || d.creativity !== null);

  return (
    <div>
      {!hasAny ? (
        <div className="text-sm text-text-tertiary py-8 text-center">
          Sem registros no período. Salve algum diário para começar a ver sua evolução.
        </div>
      ) : (
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 8, left: -12 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} interval="preserveStartEnd" />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} />
              <Tooltip
                contentStyle={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "var(--text-secondary)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {phaseChanges.map((c, i) => (
                <ReferenceLine
                  key={`${c.label}-${i}`}
                  x={c.label}
                  stroke={c.color}
                  strokeDasharray="4 3"
                  label={{ value: c.phase, position: "top", fill: c.color, fontSize: 10 }}
                />
              ))}
              <Line type="monotone" dataKey="emotion" name="Emoção" stroke="var(--sage)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="creativity" name="Criatividade" stroke="var(--terracota)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

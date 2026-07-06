import { getMoonPhaseInfo } from "@/utils/moonPhase";
import { getCyclePhaseForDay } from "@/utils/cyclePhase";

function PhaseCard({ emoji, name, description, energy, barLabel, barValue, color }:
  { emoji: string; name: string; description: string; energy: string; barLabel: string; barValue: number; color: string }) {
  return (
    <div className="bg-bg-secondary border border-border rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: color }} />
      <div className="flex items-start gap-4">
        <div className="text-5xl">{emoji}</div>
        <div className="flex-1">
          <div className="font-display text-2xl text-text-primary">{name}</div>
          <div className="text-sm text-text-secondary mt-1">{description}</div>
          <div className="label-mono mt-3" style={{ color }}>{energy}</div>
        </div>
      </div>
      <div className="mt-5">
        <div className="flex justify-between text-xs font-mono text-text-tertiary mb-1.5">
          <span>{barLabel}</span><span>{Math.round(barValue * 100)}%</span>
        </div>
        <div className="h-2 bg-bg-tertiary/40 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${barValue * 100}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

export function PhaseCards({ cycleDay, cycleLength = 28 }: { cycleDay?: number; cycleLength?: number }) {
  const moon = getMoonPhaseInfo(new Date());
  const cycle = cycleDay ? getCyclePhaseForDay(cycleDay, cycleLength) : null;

  return (
    <div className={`grid ${cycle ? "md:grid-cols-2" : ""} gap-4`}>
      <PhaseCard
        emoji={moon.emoji}
        name={`Fase da Lua · ${moon.name}`}
        description={moon.description}
        energy={moon.energy}
        barLabel="Iluminação"
        barValue={moon.illumination}
        color="var(--gold)"
      />
      {cycle && (
        <PhaseCard
          emoji={cycle.emoji}
          name={`Fase do Ciclo · ${cycle.name}`}
          description={cycle.description}
          energy={cycle.energy}
          barLabel={`Dia ${cycle.day} de ${cycle.length}`}
          barValue={cycle.progress}
          color={cycle.color}
        />
      )}
    </div>
  );
}

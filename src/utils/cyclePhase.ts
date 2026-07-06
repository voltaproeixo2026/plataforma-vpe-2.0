export type CyclePhaseInfo = {
  day: number;
  length: number;
  progress: number;
  emoji: string;
  name: string;
  description: string;
  energy: string;
  color: string;
};

export function getCyclePhaseForDay(day: number, length: number = 28): CyclePhaseInfo {
  const len = Math.max(20, Math.min(45, length || 28));
  const d = ((((day - 1) % len) + len) % len) + 1;
  const progress = d / len;

  const menstrualEnd = Math.round(len * (5 / 28));
  const folicularEnd = Math.round(len * (13 / 28));
  const ovulatoriaEnd = Math.round(len * (16 / 28));

  let emoji = "🌹", name = "", description = "", energy = "", color = "var(--terracota)";

  if (d <= menstrualEnd) {
    emoji = "🩸"; name = "Menstrual";
    description = "Pausa. Sensibilidade alta, intuição aberta.";
    energy = "Repousar e ouvir";
    color = "var(--terracota)";
  } else if (d <= folicularEnd) {
    emoji = "🌱"; name = "Folicular";
    description = "Energia renovando, vontade de criar e experimentar.";
    energy = "Plantar e iniciar";
    color = "var(--sage)";
  } else if (d <= ovulatoriaEnd) {
    emoji = "🌟"; name = "Ovulatória";
    description = "Pico de energia, magnetismo e comunicação.";
    energy = "Expandir e conectar";
    color = "var(--gold)";
  } else {
    emoji = "🍂"; name = "Lútea";
    description = "Foco interior, organização e finalização.";
    energy = "Refinar e fechar";
    color = "var(--blush)";
  }

  return { day: d, length: len, progress, emoji, name, description, energy, color };
}

export function cycleDayFromStart(lastStartISO: string, today: Date = new Date(), length: number = 28): number {
  const start = new Date(lastStartISO + "T12:00:00");
  const diff = Math.floor((today.getTime() - start.getTime()) / 86400000);
  const len = Math.max(20, Math.min(45, length || 28));
  return ((diff % len) + len) % len + 1;
}

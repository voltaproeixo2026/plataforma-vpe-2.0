export type MoonPhaseInfo = {
  phase: number;
  illumination: number;
  emoji: string;
  name: string;
  description: string;
  energy: string;
};

const SYNODIC_MONTH = 29.53058867;
const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0) / 86400000;

export function getMoonPhaseInfo(date: Date = new Date()): MoonPhaseInfo {
  const days = date.getTime() / 86400000;
  const diff = days - REF_NEW_MOON;
  let phase = (diff % SYNODIC_MONTH) / SYNODIC_MONTH;
  if (phase < 0) phase += 1;
  const illumination = (1 - Math.cos(phase * 2 * Math.PI)) / 2;

  let emoji = "🌑", name = "Lua Nova", description = "", energy = "";
  if (phase < 0.03 || phase >= 0.97) {
    emoji = "🌑"; name = "Lua Nova"; description = "Recolhimento, intenção e novos começos."; energy = "Plantar sementes";
  } else if (phase < 0.22) {
    emoji = "🌒"; name = "Crescente Côncava"; description = "Energia se firmando, ideias ganham forma."; energy = "Ação inicial";
  } else if (phase < 0.28) {
    emoji = "🌓"; name = "Quarto Crescente"; description = "Decisão e movimento."; energy = "Compromisso";
  } else if (phase < 0.47) {
    emoji = "🌔"; name = "Crescente Gibosa"; description = "Refinamento antes da expansão."; energy = "Ajustar";
  } else if (phase < 0.53) {
    emoji = "🌕"; name = "Lua Cheia"; description = "Plenitude, colheita, revelação."; energy = "Manifestar";
  } else if (phase < 0.72) {
    emoji = "🌖"; name = "Minguante Gibosa"; description = "Gratidão, compartilhar o que floresceu."; energy = "Integrar";
  } else if (phase < 0.78) {
    emoji = "🌗"; name = "Quarto Minguante"; description = "Soltar o que não serve mais."; energy = "Liberar";
  } else {
    emoji = "🌘"; name = "Minguante Côncava"; description = "Repouso, introspecção, descanso."; energy = "Descansar";
  }

  return { phase, illumination, emoji, name, description, energy };
}

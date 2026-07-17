import { supabase } from "@/integrations/supabase/client";

export const TIPOS_SEED = [
  { nome: "Conteúdo", cor: "#C9A96E" },
  { nome: "Comercial/Vendas", cor: "#C4714A" },
  { nome: "Estudos", cor: "#5B6FA8" },
  { nome: "Financeiro", cor: "#7A8C6E" },
  { nome: "Rotina Pessoal", cor: "#D4A5A0" },
  { nome: "Método/Produto", cor: "#B58BC9" },
];

// Compara SÓ ano/mês/dia locais — evita "próximo dia vira Hoje" por timezone.
export function classifyDate(dateStr: string | null): "hoje" | "atrasada" | "proxima" | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const today = new Date();
  const ty = today.getFullYear(), tm = today.getMonth() + 1, td = today.getDate();
  const a = y * 10000 + m * 100 + d;
  const b = ty * 10000 + tm * 100 + td;
  if (a === b) return "hoje";
  if (a < b) return "atrasada";
  return "proxima";
}

export function fmtDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function todayISO(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

export function fmtHoras(h: number): string {
  const total = Math.round((h || 0) * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  if (hh === 0) return `${mm}min`;
  if (mm === 0) return `${hh}h`;
  return `${hh}h${String(mm).padStart(2, "0")}`;
}

export async function ensureSeedETickle(userId: string) {
  // Seed tipos se ainda não houver
  const { data: tipos } = await supabase.from("tipos_projeto").select("id").eq("user_id", userId).limit(1);
  if (!tipos || tipos.length === 0) {
    await supabase.from("tipos_projeto").insert(TIPOS_SEED.map(t => ({ ...t, user_id: userId })));
  }
  // Garantir ciclo ativo
  const { data: ativo } = await supabase
    .from("ciclos").select("id").eq("user_id", userId).eq("status", "ativo").limit(1).maybeSingle();
  if (!ativo) {
    const { count } = await supabase.from("ciclos").select("id", { count: "exact", head: true }).eq("user_id", userId);
    const nome = `Ciclo ${(count || 0) + 1}`;
    await supabase.from("ciclos").insert({ user_id: userId, nome, data_inicio: todayISO(), status: "ativo" });
  }
}

export const PROJETO_STATUS = [
  { key: "planejamento", label: "📝 Planejamento", color: "neutral" },
  { key: "ativo", label: "⚡ Ativo", color: "terracota" },
  { key: "concluido", label: "✅ Concluído", color: "sage" },
  { key: "cancelado", label: "🚫 Cancelado", color: "neutral" },
] as const;

export const TAREFA_STATUS = [
  { key: "a_fazer", label: "A fazer" },
  { key: "em_progresso", label: "Em progresso" },
  { key: "concluida", label: "Concluída" },
  { key: "cancelada", label: "Cancelada" },
] as const;

export const TIPOS_DEFAULT = [
  { nome: "Conteúdo", cor: "#C9A96E" },
  { nome: "Comercial/Vendas", cor: "#C4714A" },
  { nome: "Estudos", cor: "#5B6FA8" },
  { nome: "Financeiro", cor: "#7A8C6E" },
  { nome: "Rotina Pessoal", cor: "#D4A5A0" },
  { nome: "Método/Produto", cor: "#B58BC9" },
];

export const CICLO_TAMANHO = 12;

export async function ensureDefaultTipos(userId: string) {
  const { data } = await supabase.from("tipos_projeto").select("id").limit(1);
  if (data && data.length > 0) return;
  await supabase.from("tipos_projeto").insert(
    TIPOS_DEFAULT.map((t) => ({ ...t, user_id: userId })),
  );
}

export async function ensureActiveCiclo(userId: string) {
  const { data } = await supabase.from("ciclos").select("*").eq("status", "ativo").maybeSingle();
  if (data) return data;
  const today = new Date().toISOString().slice(0, 10);
  const { data: novo } = await supabase.from("ciclos")
    .insert({ user_id: userId, nome: "Ciclo 1", data_inicio: today, status: "ativo" })
    .select().single();
  return novo;
}

export function formatSemana(s: { nome: string; data_inicio: string; data_fim: string } | null | undefined) {
  if (!s) return "—";
  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${s.nome} (${fmt(s.data_inicio)}–${fmt(s.data_fim)})`;
}

export function suggestNextWeek(last: { nome: string; data_fim: string } | null) {
  const today = new Date();
  if (!last) {
    const start = today;
    const end = new Date(today); end.setDate(end.getDate() + 6);
    return { nome: "Semana 1", data_inicio: start.toISOString().slice(0, 10), data_fim: end.toISOString().slice(0, 10) };
  }
  const start = new Date(last.data_fim + "T12:00:00"); start.setDate(start.getDate() + 1);
  const end = new Date(start); end.setDate(end.getDate() + 6);
  const m = last.nome.match(/^(.*?)(\d+)(.*)$/);
  const nome = m ? `${m[1]}${parseInt(m[2], 10) + 1}${m[3]}` : `${last.nome} +1`;
  return { nome, data_inicio: start.toISOString().slice(0, 10), data_fim: end.toISOString().slice(0, 10) };
}

export function formatDuracao(minutos: number | null | undefined): string {
  const m = Math.round(Number(minutos ?? 0));
  if (!m) return "0min";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h === 0) return `${mm}min`;
  if (mm === 0) return `${h}h`;
  return `${h}h ${mm}min`;
}

export function semanaAtualParaHoje(semanas: any[]): any | null {
  const hoje = new Date().toISOString().slice(0, 10);
  return semanas.find((s) => s.data_inicio <= hoje && s.data_fim >= hoje) ?? null;
}

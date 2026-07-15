import { supabase } from "@/integrations/supabase/client";

export const TIPOS_SEED = [
  { nome: "Conteúdo", cor: "#C4714A" },
  { nome: "Comercial/Vendas", cor: "#5B6FA8" },
  { nome: "Estudos", cor: "#7A8C6E" },
  { nome: "Financeiro", cor: "#C9A96E" },
  { nome: "Rotina Pessoal", cor: "#D4A5A0" },
  { nome: "Método/Produto", cor: "#E8A838" },
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

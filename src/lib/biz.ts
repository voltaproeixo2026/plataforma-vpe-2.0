export const fmtBRL = (v: number | null | undefined) =>
  "R$ " + Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const fmtDate = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d + (d.length === 10 ? "T12:00:00" : "")) : d;
  return date.toLocaleDateString("pt-BR");
};

export const fmtDateLong = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const monthRef = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

export const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const fmtMins = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

export const greeting = (name?: string | null) => {
  const h = new Date().getHours();
  const who = name?.trim() ? `, ${name.trim()}` : "";
  if (h < 12) return { text: `Bom dia${who}`, emoji: "☀️" };
  if (h < 18) return { text: `Boa tarde${who}`, emoji: "🌤" };
  return { text: `Boa noite${who}`, emoji: "🌙" };
};

export function buildEmbedUrl(url: string): string | null {
  if (url.includes("/pubhtml") || url.includes("/pub?")) {
    return url.includes("widget=true") ? url : url + (url.includes("?") ? "&" : "?") + "widget=true&headers=false";
  }
  if (url.includes("embedded=true") || url.includes("/htmlembed")) return url;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return null;
  const id = match[1];
  const gidMatch = url.match(/gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return `https://docs.google.com/spreadsheets/d/${id}/preview?widget=true&headers=false&rm=minimal&gid=${gid}`;
}

export const TEMPERATURAS = [
  { key: "frio", label: "❄️ Frio", color: "blue" },
  { key: "morno", label: "🌤 Morno", color: "gold" },
  { key: "quente", label: "🔥 Quente", color: "terracota" },
  { key: "muito-quente", label: "🔥🔥 Muito Quente", color: "amber" },
] as const;

export const CONTACT_STATUSES = [
  { key: "acompanhando", label: "👀 Acompanhando", color: "neutral" },
  { key: "chamar-sessao", label: "📣 Chamar pra sessão", color: "blush" },
  { key: "negociando", label: "🤝 Negociando", color: "sage" },
  { key: "proposta", label: "📄 Proposta", color: "gold" },
  { key: "fechou", label: "✅ Fechou", color: "sage" },
  { key: "parceiro", label: "🌱 Parceiro", color: "dark" },
] as const;

export const TASK_CATEGORIES = ["vendas", "conteudo", "comunidade", "financeiro", "admin", "pessoal", "outro"];
export const TASK_PRIORITIES = ["alta", "media", "baixa"] as const;
export const TASK_EXECUTION = [
  { key: "fazer", label: "📋 Fazer" },
  { key: "fazendo", label: "⚡ Fazendo" },
  { key: "standby", label: "⏸ Standby" },
] as const;

export const TIME_CATEGORIES = [
  { key: "conteudo", label: "Conteúdo", color: "#C9A96E" },
  { key: "vendas", label: "Vendas", color: "#C4714A" },
  { key: "reunioes", label: "Reuniões", color: "#7A8C6E" },
  { key: "admin", label: "Admin", color: "#5B6FA8" },
  { key: "aprendizado", label: "Aprendizado", color: "#D4A5A0" },
  { key: "pessoal", label: "Pessoal", color: "#9AAD8A" },
  { key: "outro", label: "Outro", color: "#A39890" },
];

export const FAT_CATEGORIES = ["Serviço", "Produto", "Consultoria", "Curso", "Assinatura", "Outro"];

export const CONTENT_FORMATS = ["Carrossel", "Reels", "Stories", "Post único", "Vídeo", "Outro"];
export const CONTENT_STATUSES = ["Ideias", "Em produção", "Agendado", "Publicado"];
export const CONTENT_FUNIS = [
  { key: "atracao", label: "🎯 Atração", color: "var(--blue)" },
  { key: "conexao", label: "💛 Conexão", color: "var(--gold)" },
  { key: "venda", label: "💰 Venda", color: "var(--terracota)" },
];
export const CONTENT_ETAPAS = ["roteiro", "gravacao", "edicao", "standby"];

export const ACTION_TYPES = ["Lançamento", "Campanha", "Evento", "Parceria", "Outro"];

export const EVENT_TYPES = [
  { key: "tc", label: "Vendas/Lançamento", color: "var(--terracota)" },
  { key: "sg", label: "Reunião", color: "var(--sage)" },
  { key: "gd", label: "Conteúdo", color: "var(--gold)" },
  { key: "bl", label: "Pessoal", color: "var(--blue)" },
  { key: "cm", label: "Comunidade", color: "var(--blush)" },
  { key: "ot", label: "Outros", color: "var(--text-tertiary)" },
];

export const OBJ_CATEGORIES = ["financeiro", "conteudo", "vendas", "pessoal", "outro"];

export const ORIGENS = ["Instagram", "Indicação", "WhatsApp", "LinkedIn", "Evento", "Outro"];

export const PROSPECCAO_OPTIONS = [
  "social-selling",
  "indicacao",
  "conteudo",
  "outbound",
  "evento",
];

export function monthRange(mref: string): { start: string; end: string } {
  const [y, m] = mref.split("-").map(Number);
  const start = `${mref}-01`;
  const last = new Date(y, m, 0).getDate();
  const end = `${mref}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, MetricCard, ProgressBar, SectionTitle } from "@/components/ui-custom";
import { greeting, fmtDateLong, todayISO, monthRef, getMonday, addDays, fmtBRL } from "@/lib/biz";
import { CycleWelcomeCard } from "@/components/CycleWelcomeCard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Visão Geral — Painel" }] }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const today = todayISO();
  const mref = monthRef();
  const monday = getMonday(new Date());
  const sunday = addDays(monday, 6);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-name", uid],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name").eq("id", uid).maybeSingle();
      return data;
    },
  });
  const g = greeting(profile?.display_name);

  const startEdit = () => {
    setNameDraft(profile?.display_name ?? "");
    setEditingName(true);
  };
  const saveName = async () => {
    const clean = nameDraft.trim();
    if (!clean) { toast.error("Digite um nome"); return; }
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ display_name: clean }).eq("id", uid);
    setSavingName(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Nome atualizado");
    setEditingName(false);
    qc.invalidateQueries({ queryKey: ["profile-name", uid] });
    qc.invalidateQueries({ queryKey: ["profile-header", uid] });
    qc.invalidateQueries({ queryKey: ["profile-edit", uid] });
  };


  const { data } = useQuery({
    queryKey: ["home", uid],
    queryFn: async () => {
      const [contacts, hot, ssToday, ssWeek, fatMonth, fatMeta, ssCfg, tasks, events] = await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("temperatura", "quente"),
        supabase.from("ss_counts").select("abordagem").eq("date", today).maybeSingle(),
        supabase.from("ss_counts").select("abordagem").gte("date", monday.toISOString().slice(0, 10)).lte("date", sunday.toISOString().slice(0, 10)),
        supabase.from("fat_entries").select("value").like("date", `${mref}%`),
        supabase.from("fat_meta").select("value").eq("month_ref", mref).maybeSingle(),
        supabase.from("ss_config").select("*").maybeSingle(),
        supabase.from("tasks").select("*").eq("date", today).eq("done", false).order("priority"),
        supabase.from("calendar_events").select("*").gte("date", today).order("date").limit(5),
      ]);
      return {
        contactsCount: contacts.count ?? 0,
        hotCount: hot.count ?? 0,
        ssToday: ssToday.data?.abordagem ?? 0,
        ssWeek: (ssWeek.data ?? []).reduce((a, b) => a + (b.abordagem ?? 0), 0),
        fatMonth: (fatMonth.data ?? []).reduce((a, b) => a + Number(b.value), 0),
        fatMeta: Number(fatMeta.data?.value ?? 0),
        ssCfg: ssCfg.data ?? { meta_day: 10 },
        tasks: tasks.data ?? [],
        events: events.data ?? [],
      };
    },
  });

  const d = data;
  const pOrder: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
  const sortedTasks = (d?.tasks ?? []).slice().sort((a: any, b: any) => pOrder[a.priority] - pOrder[b.priority]).slice(0, 5);

  return (
    <div>
      <PageHeader title={`${g.text} ${g.emoji}`} subtitle={fmtDateLong(new Date())} />

      <CycleWelcomeCard uid={uid} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Contatos CRM" value={d?.contactsCount ?? "—"} color="terracota" />
        <MetricCard label="Abordagens hoje" value={d?.ssToday ?? "—"} sub={`Meta: ${d?.ssCfg?.meta_day ?? 10}/dia`} color="sage" />
        <MetricCard label="Faturado no mês" value={fmtBRL(d?.fatMonth)} sub={`Meta: ${fmtBRL(d?.fatMeta)}`} color="gold" />
        <MetricCard label="Leads quentes" value={d?.hotCount ?? "—"} color="amber" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <SectionTitle>Meta de Faturamento</SectionTitle>
          <ProgressBar value={d?.fatMonth ?? 0} max={d?.fatMeta || 1} color="var(--gold)"
            leftLabel={fmtBRL(d?.fatMonth)} rightLabel={`${Math.round(((d?.fatMonth ?? 0) / (d?.fatMeta || 1)) * 100)}%`} />
          <div className="text-xs text-text-secondary mt-2">Faltam {fmtBRL(Math.max(0, (d?.fatMeta ?? 0) - (d?.fatMonth ?? 0)))}</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <SectionTitle>Abordagens da semana</SectionTitle>
          <ProgressBar value={d?.ssWeek ?? 0} max={(d?.ssCfg?.meta_day ?? 10) * 5} color="var(--sage)"
            leftLabel={`${d?.ssWeek ?? 0} abordagens`} rightLabel={`Meta: ${(d?.ssCfg?.meta_day ?? 10) * 5}`} />
        </div>
      </div>

      <SectionTitle>Acesso rápido</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { to: "/crm", label: "Novo contato", emoji: "👤" },
          { to: "/faturamento", label: "Registrar venda", emoji: "💰" },
          { to: "/tarefas", label: "Nova tarefa", emoji: "✅" },
          { to: "/tempo", label: "Registrar tempo", emoji: "⏱" },
        ].map((q) => (
          <Link key={q.to} to={q.to} className="bg-bg-primary border border-border rounded-xl p-4 hover:border-terracota transition flex items-center gap-3">
            <span className="text-2xl">{q.emoji}</span>
            <span className="font-mono text-sm">{q.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-bg-primary border border-border rounded-xl p-5">
          <SectionTitle>Tarefas de hoje</SectionTitle>
          {sortedTasks.length === 0 ? (
            <div className="text-text-tertiary text-sm">Nenhuma tarefa pendente 🎉</div>
          ) : (
            <ul className="space-y-2">
              {sortedTasks.map((t: any) => (
                <li key={t.id} className="flex items-center gap-3 py-1 text-sm">
                  <span className={`w-2 h-2 rounded-full ${t.priority === "alta" ? "bg-[#e05c5c]" : t.priority === "media" ? "bg-gold" : "bg-sage"}`} />
                  {t.text}
                </li>
              ))}
            </ul>
          )}
          <Link to="/tarefas" className="text-xs text-terracota font-mono mt-3 inline-block">Ver todas →</Link>
        </div>
        <div className="bg-bg-primary border border-border rounded-xl p-5">
          <SectionTitle>Próximos eventos</SectionTitle>
          {(d?.events ?? []).length === 0 ? (
            <div className="text-text-tertiary text-sm">Sem eventos próximos</div>
          ) : (
            <ul className="space-y-2">
              {(d?.events ?? []).map((e: any) => (
                <li key={e.id} className="text-sm flex items-center gap-3">
                  <span className="font-mono text-xs text-text-tertiary w-20">{new Date(e.date + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                  <span>{e.title}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/calendario" className="text-xs text-terracota font-mono mt-3 inline-block">Abrir calendário →</Link>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, Btn, inputCls, Tag, EmptyState } from "@/components/ui-custom";
import { CONTACT_STATUSES, TEMPERATURAS, todayISO } from "@/lib/biz";
import { Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/follow-up")({
  head: () => ({ meta: [{ title: "Follow Up — Painel" }] }),
  component: FollowUpPage,
});

function FollowUpPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [obj, setObj] = useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ["follow_up", uid],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("*").not("follow_up_date", "is", null).order("follow_up_date", { ascending: true });
      return data ?? [];
    },
  });

  const filtered = useMemo(() => contacts.filter((c: any) => {
    if (from && c.follow_up_date < from) return false;
    if (to && c.follow_up_date > to) return false;
    if (obj && !(c.follow_up_objective ?? "").toLowerCase().includes(obj.toLowerCase())) return false;
    return true;
  }), [contacts, from, to, obj]);

  const today = todayISO();
  const overdue = filtered.filter((c: any) => c.follow_up_date < today);
  const todayItems = filtered.filter((c: any) => c.follow_up_date === today);
  const upcoming = filtered.filter((c: any) => c.follow_up_date > today);

  const done = async (id: string) => {
    await supabase.from("contacts").update({ follow_up_date: null, follow_up_objective: null }).eq("id", id);
    toast.success("Concluído");
    qc.invalidateQueries({ queryKey: ["follow_up"] });
    qc.invalidateQueries({ queryKey: ["contacts"] });
  };

  return (
    <div>
      <PageHeader title="Follow Up" subtitle={`${filtered.length} pendentes`} />

      <div className="bg-bg-primary border border-border rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div><div className="label-mono mb-1">De</div><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><div className="label-mono mb-1">Até</div><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="flex-1 min-w-[200px]"><div className="label-mono mb-1">Objetivo</div><input className={inputCls} value={obj} onChange={(e) => setObj(e.target.value)} /></div>
        {(from || to || obj) && <Btn variant="ghost" onClick={() => { setFrom(""); setTo(""); setObj(""); }}>Limpar</Btn>}
      </div>

      <Section title={`🔴 Atrasados (${overdue.length})`} items={overdue} onDone={done} />
      <Section title={`⭐ Hoje (${todayItems.length})`} items={todayItems} onDone={done} />
      <Section title={`📅 Próximos (${upcoming.length})`} items={upcoming} onDone={done} />

      {filtered.length === 0 && <EmptyState icon="🔄" text="Nenhum follow-up agendado. Adicione na ficha do contato no CRM." />}
    </div>
  );
}

function Section({ title, items, onDone }: any) {
  if (items.length === 0) return null;
  return (
    <div className="mb-5">
      <div className="label-mono mb-2">{title}</div>
      <ul className="space-y-2">
        {items.map((c: any) => {
          const st = CONTACT_STATUSES.find(s => s.key === c.status);
          const temp = TEMPERATURAS.find(t => t.key === c.temperatura);
          return (
            <li key={c.id} className="bg-bg-primary border border-border rounded-lg p-3 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-text-tertiary">
                  {c.follow_up_objective || <span className="italic">sem objetivo</span>}
                  {c.next_action && <span className="ml-2">· próx: {c.next_action}</span>}
                </div>
              </div>
              <span className="font-mono text-xs text-text-tertiary">🔄 {new Date(c.follow_up_date + "T12:00").toLocaleDateString("pt-BR")}</span>
              {temp && <Tag color={temp.color}>{temp.label}</Tag>}
              {st && <Tag color={st.color}>{st.label}</Tag>}
              <button onClick={() => onDone(c.id)} className="text-sage hover:text-text-primary"><Check size={16} /></button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

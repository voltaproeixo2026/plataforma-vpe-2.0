import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, Btn, Modal, Field, inputCls, Tag, MetricCard, Chip } from "@/components/ui-custom";
import { CONTENT_FORMATS, CONTENT_STATUSES, CONTENT_FUNIS, CONTENT_ETAPAS, monthRef, monthRange } from "@/lib/biz";
import { X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { AutenticidadeMap } from "@/components/content/AutenticidadeMap";
import { Arsenal } from "@/components/content/Arsenal";
import { StoriesBank } from "@/components/content/StoriesBank";

type Section = "planejamento" | "mapa" | "arsenal" | "historias";

export const Route = createFileRoute("/_authenticated/conteudo")({
  head: () => ({ meta: [{ title: "Conteúdo — Painel" }] }),
  component: ContentPage,
});

function ContentPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>("planejamento");
  const [tab, setTab] = useState<"cards" | "calendario">("cards");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [initialDate, setInitialDate] = useState<string>("");
  const [funilFilter, setFunilFilter] = useState<string>("todos");
  const [etapaFilter, setEtapaFilter] = useState<string>("todos");
  const [mref, setMref] = useState(monthRef());

  const SECTIONS: { key: Section; label: string }[] = [
    { key: "planejamento", label: "📅 Planejamento" },
    { key: "mapa", label: "🧭 Mapa da Autenticidade" },
    { key: "arsenal", label: "🗂 Arsenal" },
    { key: "historias", label: "📖 Banco de Histórias" },
  ];


  const { data: cards = [] } = useQuery({
    queryKey: ["content", uid],
    queryFn: async () => {
      const { data } = await supabase.from("content_cards").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const inv = () => qc.invalidateQueries({ queryKey: ["content"] });
  const remove = async (id: string) => { await supabase.from("content_cards").delete().eq("id", id); toast.success("Removido"); inv(); };
  const advance = async (c: any) => {
    const idx = CONTENT_STATUSES.indexOf(c.status);
    if (idx >= CONTENT_STATUSES.length - 1) return;
    await supabase.from("content_cards").update({ status: CONTENT_STATUSES[idx + 1] }).eq("id", c.id);
    inv();
  };

  const filtered = useMemo(() => cards.filter((c: any) => {
    const okF = funilFilter === "todos" || c.funil === funilFilter;
    const okE = etapaFilter === "todos" || c.etapa === etapaFilter;
    return okF && okE;
  }), [cards, funilFilter, etapaFilter]);

  const { start, end } = monthRange(mref);
  const monthCards = cards.filter((c: any) => c.publish_date && c.publish_date >= start && c.publish_date <= end);
  const plannedMonth = monthCards.length;
  const publishedMonth = monthCards.filter((c: any) => c.status === "Publicado").length;
  const rateMonth = plannedMonth > 0 ? Math.round((publishedMonth / plannedMonth) * 100) : 0;

  const byStatus = (s: string) => filtered.filter((c: any) => c.status === s);
  const monthLabel = new Date(start + "T12:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const [y, m] = mref.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m - 1, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const byDate: Record<string, any[]> = {};
  cards.forEach((c: any) => { if (c.publish_date) (byDate[c.publish_date] ||= []).push(c); });
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Conteúdo">
        {section === "planejamento" && (
          <>
            <div className="flex gap-1 bg-bg-secondary rounded-lg p-1">
              <button onClick={() => setTab("cards")} className={`px-3 py-1.5 rounded text-xs font-mono ${tab === "cards" ? "bg-dark text-bg-primary" : "text-text-secondary"}`}>Kanban</button>
              <button onClick={() => setTab("calendario")} className={`px-3 py-1.5 rounded text-xs font-mono ${tab === "calendario" ? "bg-dark text-bg-primary" : "text-text-secondary"}`}>Calendário</button>
            </div>
            <Btn onClick={() => { setEditing(null); setInitialDate(""); setOpen(true); }}>+ Conteúdo</Btn>
          </>
        )}
      </PageHeader>

      <div className="flex gap-2 overflow-x-auto mb-5 border-b border-border">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`px-4 py-2.5 text-sm font-mono whitespace-nowrap border-b-2 transition ${
              section === s.key
                ? "border-terracota text-terracota"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "mapa" && <AutenticidadeMap userId={uid} />}
      {section === "arsenal" && <Arsenal userId={uid} />}
      {section === "historias" && <StoriesBank userId={uid} />}

      {section === "planejamento" && (
        <>
      <div className="flex items-center gap-2 mb-4">
        <span className="label-mono">Mês:</span>
        <input type="month" className={`${inputCls} w-40`} value={mref} onChange={(e) => setMref(e.target.value)} />
        <span className="text-xs text-text-tertiary capitalize">{monthLabel}</span>
      </div>


      {tab === "cards" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <MetricCard label="Planejados no mês" value={plannedMonth} color="blue" />
            <MetricCard label="Publicados" value={publishedMonth} color="sage" />
            <MetricCard label="Taxa publicação" value={`${rateMonth}%`} color="terracota" />
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex gap-2 overflow-x-auto pb-1 items-center">
              <span className="label-mono mr-1">Funil:</span>
              <Chip active={funilFilter === "todos"} onClick={() => setFunilFilter("todos")}>Todos</Chip>
              {CONTENT_FUNIS.map(f => <Chip key={f.key} active={funilFilter === f.key} onClick={() => setFunilFilter(f.key)}>{f.label}</Chip>)}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 items-center">
              <span className="label-mono mr-1">Etapa:</span>
              <Chip active={etapaFilter === "todos"} onClick={() => setEtapaFilter("todos")}>Todas</Chip>
              {CONTENT_ETAPAS.map(e => <Chip key={e} active={etapaFilter === e} onClick={() => setEtapaFilter(e)}>{e}</Chip>)}
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {CONTENT_STATUSES.map((s) => (
              <div key={s} className="bg-bg-secondary rounded-xl p-4">
                <div className="label-mono mb-3">{s} <span className="text-text-tertiary">({byStatus(s).length})</span></div>
                <div className="space-y-2">
                  {byStatus(s).length === 0 ? <div className="text-xs text-text-tertiary">—</div> : byStatus(s).map((c: any) => {
                    const fun = CONTENT_FUNIS.find(f => f.key === c.funil);
                    return (
                      <div key={c.id} onClick={() => { setEditing(c); setOpen(true); }} className="bg-bg-primary border border-border rounded-lg p-3 cursor-pointer hover:border-terracota/50 transition">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium text-sm flex-1">{c.title}</div>
                          <button onClick={(ev) => { ev.stopPropagation(); remove(c.id); }} className="text-text-tertiary hover:text-[#e05c5c]"><X size={14} /></button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Tag color="terracota">{c.format}</Tag>
                          {fun && <Tag color="blue">{fun.label}</Tag>}
                          {c.etapa && <Tag color="gold">{c.etapa}</Tag>}
                          {c.publish_date && <Tag color="neutral">{new Date(c.publish_date + "T12:00").toLocaleDateString("pt-BR")}</Tag>}
                        </div>
                        {c.notes && <div className="text-xs text-text-secondary mt-2 line-clamp-2">{c.notes}</div>}
                        {s !== "Publicado" && (
                          <button onClick={(ev) => { ev.stopPropagation(); advance(c); }} className="mt-3 text-xs text-terracota font-mono flex items-center gap-1">Avançar <ArrowRight size={12} /></button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "calendario" && (
        <div className="bg-bg-primary border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 bg-bg-secondary">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(w => (
              <div key={w} className="px-2 py-2 text-center label-mono text-text-secondary border-r border-border last:border-r-0">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              const iso = d ? `${y}-${String(m).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";
              const items = d ? (byDate[iso] ?? []) : [];
              const isToday = iso === todayStr;
              return (
                <div key={i} className={`min-h-[110px] border-r border-b border-border last:border-r-0 p-1.5 ${d ? "" : "bg-bg-secondary/40"} ${isToday ? "bg-terracota/5" : ""}`}>
                  {d && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <div className={`text-[11px] font-mono ${isToday ? "text-terracota font-bold" : "text-text-tertiary"}`}>{d.getDate()}</div>
                        <button onClick={() => { setEditing(null); setInitialDate(iso); setOpen(true); }} className="w-4 h-4 flex items-center justify-center rounded-full bg-bg-secondary text-text-tertiary hover:bg-terracota hover:text-white text-[10px]">+</button>
                      </div>
                      <div className="space-y-1">
                        {items.map((c: any) => {
                          const fun = CONTENT_FUNIS.find(f => f.key === c.funil);
                          return (
                            <button key={c.id} onClick={() => { setEditing(c); setOpen(true); }} style={{ background: fun?.color ?? "var(--bg-secondary)", color: "#fff" }} className="w-full text-left text-[10px] rounded px-1.5 py-1 hover:opacity-80 truncate block">
                              <div className="truncate font-medium">{c.title}</div>
                              <div className="truncate opacity-80">{c.format}{c.status === "Publicado" ? " ✓" : ""}</div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
        </>
      )}

      {open && <ContentModal uid={uid} editing={editing} initialDate={initialDate} onClose={() => { setOpen(false); setInitialDate(""); }} onSaved={inv} />}
    </div>
  );
}

function ContentModal({ uid, editing, initialDate, onClose, onSaved }: any) {
  const e = editing ?? {};
  const [id, setId] = useState<string | null>(e.id ?? null);
  const [title, setTitle] = useState(e.title ?? "");
  const [format, setFormat] = useState(e.format ?? "Post único");
  const [status, setStatus] = useState(e.status ?? "Ideias");
  const [funil, setFunil] = useState(e.funil ?? "atracao");
  const [etapa, setEtapa] = useState(e.etapa ?? "roteiro");
  const [date, setDate] = useState(e.publish_date ?? initialDate ?? "");
  const [linkRef, setLinkRef] = useState(e.link_referencia ?? "");
  const [notes, setNotes] = useState(e.notes ?? "");
  const [desenvolvimento, setDesenvolvimento] = useState(e.desenvolvimento ?? "");
  const [cta, setCta] = useState(e.cta ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initial = useRef(true);
  const idRef = useRef<string | null>(e.id ?? null);

  const persist = async () => {
    if (!title.trim()) return;
    setSaveState("saving");
    const payload = { title, format, status, funil, etapa, publish_date: date || null, notes };
    try {
      if (idRef.current) {
        const { error } = await supabase.from("content_cards").update(payload).eq("id", idRef.current);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("content_cards").insert({ ...payload, user_id: uid }).select("id").single();
        if (error) throw error;
        if (data?.id) { idRef.current = data.id; setId(data.id); }
      }
      setSaveState("saved");
      onSaved();
    } catch (err) {
      setSaveState("error");
      toast.error("Erro ao salvar");
    }
  };

  useEffect(() => {
    if (initial.current) { initial.current = false; return; }
    if (!title.trim()) return;
    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = setTimeout(() => { persist(); }, 800);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, format, status, funil, etapa, date, notes]);

  const statusLabel =
    saveState === "saving" ? "Salvando…" :
    saveState === "saved" ? "✓ Alterações salvas" :
    saveState === "error" ? "Erro ao salvar" :
    title.trim() ? "" : "Digite um título para salvar";

  return (
    <Modal open onClose={onClose} title={id ? "Editar conteúdo" : "Novo conteúdo"} wide>
      <Field label="Título *"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
      <div className="grid md:grid-cols-2 gap-x-4">
        <Field label="Formato"><select className={inputCls} value={format} onChange={(e) => setFormat(e.target.value)}>{CONTENT_FORMATS.map(f => <option key={f}>{f}</option>)}</select></Field>
        <Field label="Status"><select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>{CONTENT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Funil"><select className={inputCls} value={funil} onChange={(e) => setFunil(e.target.value)}>{CONTENT_FUNIS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}</select></Field>
        <Field label="Etapa"><select className={inputCls} value={etapa} onChange={(e) => setEtapa(e.target.value)}>{CONTENT_ETAPAS.map(e => <option key={e}>{e}</option>)}</select></Field>
        <Field label="Data de publicação"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
      <Field label="Legendas"><textarea className={inputCls} rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cole ou escreva aqui a legenda do conteúdo" /></Field>
      <div className="flex items-center justify-between mt-4">
        <div className={`text-xs font-mono ${saveState === "error" ? "text-red-500" : "text-text-tertiary"}`}>{statusLabel}</div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onClose}>Fechar</Btn>
          <Btn onClick={persist} disabled={!title.trim() || saveState === "saving"}>Salvar agora</Btn>
        </div>
      </div>
    </Modal>
  );
}

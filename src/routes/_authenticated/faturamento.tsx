import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, Btn, Modal, Field, inputCls, Tag, ProgressBar, EmptyState } from "@/components/ui-custom";
import { FAT_CATEGORIES, fmtBRL, monthRef, monthRange, todayISO, buildEmbedUrl } from "@/lib/biz";
import { X, Settings, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/faturamento")({
  head: () => ({ meta: [{ title: "Faturamento — Painel" }] }),
  component: FatPage,
});

function FatPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const mref = monthRef();
  const { start, end } = monthRange(mref);
  const [openEntry, setOpenEntry] = useState(false);
  const [openMeta, setOpenMeta] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ["fat_entries", uid, mref],
    queryFn: async () => {
      const { data } = await supabase.from("fat_entries").select("*").gte("date", start).lte("date", end).order("date", { ascending: false });
      return data ?? [];
    },
  });
  const { data: meta } = useQuery({
    queryKey: ["fat_meta", uid, mref],
    queryFn: async () => {
      const { data } = await supabase.from("fat_meta").select("*").eq("month_ref", mref).maybeSingle();
      return data;
    },
  });
  const { data: sheet } = useQuery({
    queryKey: ["sheets_config", uid],
    queryFn: async () => {
      const { data } = await supabase.from("sheets_config").select("*").maybeSingle();
      return data;
    },
  });

  const total = entries.reduce((a, b) => a + Number(b.value), 0);
  const metaVal = Number(meta?.value ?? 0);
  const falta = Math.max(0, metaVal - total);

  const remove = async (id: string) => {
    await supabase.from("fat_entries").delete().eq("id", id);
    toast.success("Removido");
    qc.invalidateQueries({ queryKey: ["fat_entries"] });
  };

  return (
    <div>
      <PageHeader title="Faturamento" subtitle={new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}>
        <Btn variant="ghost" onClick={() => setOpenMeta(true)}>🎯 Meta</Btn>
        <Btn onClick={() => setOpenEntry(true)}>+ Registrar</Btn>
      </PageHeader>

      <div className="bg-dark text-bg-primary rounded-2xl p-6 mb-6">
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div><div className="label-mono text-bg-tertiary/70">Faturado</div><div className="font-display text-3xl">{fmtBRL(total)}</div></div>
          <div><div className="label-mono text-bg-tertiary/70">Meta</div><div className="font-display text-3xl">{fmtBRL(metaVal)}</div></div>
          <div><div className="label-mono text-bg-tertiary/70">Falta</div><div className="font-display text-3xl text-gold">{fmtBRL(falta)}</div></div>
        </div>
        <ProgressBar value={total} max={metaVal || 1} color="var(--gold)" />
      </div>

      <div className="bg-bg-primary border border-border rounded-xl p-5 mb-6">
        <div className="flex justify-between items-center mb-3">
          <div className="label-mono">📊 Planilha (Google Sheets)</div>
          <Btn variant="ghost" onClick={() => setOpenSheet(true)}><Settings size={14} /></Btn>
        </div>
        {!sheet ? (
          <div className="text-center py-10 bg-bg-secondary rounded-lg">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm text-text-secondary mb-3">Conecte uma planilha para vê-la aqui (opcional)</p>
            <Btn onClick={() => setOpenSheet(true)}>Conectar</Btn>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="font-mono">{sheet.name}</span>
              <a href={sheet.url} target="_blank" rel="noopener" className="text-terracota text-xs flex items-center gap-1"><ExternalLink size={12} />Abrir</a>
            </div>
            <iframe src={sheet.embed_url} style={{ height: sheet.height ?? 520 }} className="w-full rounded-lg border border-border" allow="fullscreen" />
          </div>
        )}
      </div>

      <div className="label-mono mb-3">Entradas do mês</div>
      {entries.length === 0 ? <EmptyState icon="💰" text="Sem entradas neste mês" /> : (
        <ul className="space-y-2">
          {entries.map((e: any) => (
            <li key={e.id} className="bg-bg-primary border border-border rounded-lg px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-medium">{e.description}</div>
                <div className="text-xs text-text-tertiary">{new Date(e.date + "T12:00").toLocaleDateString("pt-BR")}</div>
              </div>
              <Tag color="terracota">{e.category}</Tag>
              <div className="font-display text-xl text-sage">{fmtBRL(Number(e.value))}</div>
              <button onClick={() => remove(e.id)} className="text-text-tertiary hover:text-[#e05c5c]"><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}

      {openEntry && <EntryModal uid={uid} onClose={() => setOpenEntry(false)} onSaved={() => qc.invalidateQueries({ queryKey: ["fat_entries"] })} />}
      {openMeta && <MetaModal uid={uid} mref={mref} current={metaVal} onClose={() => setOpenMeta(false)} onSaved={() => qc.invalidateQueries({ queryKey: ["fat_meta"] })} />}
      {openSheet && <SheetModal uid={uid} current={sheet} onClose={() => setOpenSheet(false)} onSaved={() => qc.invalidateQueries({ queryKey: ["sheets_config"] })} />}
    </div>
  );
}

function EntryModal({ uid, onClose, onSaved }: any) {
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState(FAT_CATEGORIES[0]);
  const save = async () => {
    if (!description.trim() || !value) { toast.error("Preencha descrição e valor"); return; }
    const { error } = await supabase.from("fat_entries").insert({ user_id: uid, description, value: Number(value), date, category });
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo"); onSaved(); onClose();
  };
  return (
    <Modal open onClose={onClose} title="Registrar entrada">
      <Field label="Descrição *"><input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} autoFocus /></Field>
      <Field label="Valor (R$) *"><input type="number" className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} /></Field>
      <Field label="Data"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Categoria"><select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>{FAT_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
      <div className="flex gap-2 justify-end mt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>Salvar</Btn></div>
    </Modal>
  );
}

function MetaModal({ uid, mref, current, onClose, onSaved }: any) {
  const [value, setValue] = useState(current ?? 0);
  const save = async () => {
    await supabase.from("fat_meta").upsert({ user_id: uid, month_ref: mref, value: Number(value) }, { onConflict: "user_id,month_ref" });
    toast.success("Meta salva"); onSaved(); onClose();
  };
  return (
    <Modal open onClose={onClose} title="Meta do mês">
      <Field label="Valor (R$)"><input type="number" className={inputCls} value={value} onChange={(e) => setValue(+e.target.value)} autoFocus /></Field>
      <div className="flex gap-2 justify-end mt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>Salvar</Btn></div>
    </Modal>
  );
}

function SheetModal({ uid, current, onClose, onSaved }: any) {
  const [url, setUrl] = useState(current?.url ?? "");
  const [name, setName] = useState(current?.name ?? "Planilha Financeira");
  const [height, setHeight] = useState(current?.height ?? 520);
  const save = async () => {
    if (!url.startsWith("https://docs.google.com/spreadsheets/")) { toast.error("Link inválido"); return; }
    const embed = buildEmbedUrl(url);
    if (!embed) { toast.error("Não consegui extrair o ID"); return; }
    await supabase.from("sheets_config").upsert({ user_id: uid, url, embed_url: embed, name, height: Number(height), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    toast.success("Conectada"); onSaved(); onClose();
  };
  const remove = async () => {
    await supabase.from("sheets_config").delete().eq("user_id", uid);
    toast.success("Desconectada"); onSaved(); onClose();
  };
  return (
    <Modal open onClose={onClose} title="Configurar planilha">
      <Field label="Link *"><input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." /></Field>
      <Field label="Nome"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Altura">
        <select className={inputCls} value={height} onChange={(e) => setHeight(+e.target.value)}>
          <option value={400}>Pequena (400px)</option>
          <option value={520}>Média (520px)</option>
          <option value={700}>Grande (700px)</option>
          <option value={900}>Extra (900px)</option>
        </select>
      </Field>
      <div className="flex gap-2 justify-end mt-4">
        {current && <Btn variant="danger" onClick={remove}>Remover</Btn>}
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={save}>Salvar</Btn>
      </div>
    </Modal>
  );
}

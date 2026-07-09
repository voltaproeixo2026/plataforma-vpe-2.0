import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Field, inputCls, Modal, Tag, EmptyState, Chip } from "@/components/ui-custom";
import { toast } from "sonner";
import { X } from "lucide-react";

const CATEGORIES = [
  "Frases",
  "Insights",
  "Cases",
  "Referências",
  "Dores do público",
  "Objeções",
  "Depoimentos",
  "Outro",
];

const TAG_COLORS = ["terracota", "sage", "gold", "blue", "blush", "amber"];

export function Arsenal({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filter, setFilter] = useState<string>("todos");

  const load = async () => {
    const { data } = await (supabase as any)
      .from("arsenal_entries")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    await (supabase as any).from("arsenal_entries").delete().eq("id", id);
    toast.success("Removido");
    load();
  };

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    const list = filter === "todos" ? items : items.filter((i) => i.category === filter);
    list.forEach((i) => { (g[i.category] ||= []).push(i); });
    return g;
  }, [items, filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-2 overflow-x-auto items-center">
          <span className="label-mono mr-1">Categoria:</span>
          <Chip active={filter === "todos"} onClick={() => setFilter("todos")}>Todas</Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>{c}</Chip>
          ))}
        </div>
        <Btn onClick={() => { setEditing(null); setOpen(true); }}>+ Nova entrada</Btn>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <EmptyState icon="🗂" text="Nenhuma entrada ainda. Comece o seu arsenal." />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat}>
              <div className="label-mono mb-2">{cat} <span className="text-text-tertiary">({list.length})</span></div>
              <div className="grid md:grid-cols-2 gap-3">
                {list.map((e) => (
                  <div
                    key={e.id}
                    className="bg-bg-primary border border-border rounded-lg p-4 cursor-pointer hover:border-terracota/50 transition"
                    onClick={() => { setEditing(e); setOpen(true); }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm whitespace-pre-wrap flex-1">{e.raw_content}</div>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); remove(e.id); }}
                        className="text-text-tertiary hover:text-[#e05c5c]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {e.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {e.tags.map((t: string, i: number) => (
                          <Tag key={i} color={TAG_COLORS[i % TAG_COLORS.length]}>{t}</Tag>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <ArsenalModal
          userId={userId}
          editing={editing}
          onClose={() => setOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function ArsenalModal({ userId, editing, onClose, onSaved }: any) {
  const e = editing ?? {};
  const [category, setCategory] = useState(e.category ?? CATEGORIES[0]);
  const [raw, setRaw] = useState(e.raw_content ?? "");
  const [tagsStr, setTagsStr] = useState((e.tags ?? []).join(", "));

  const save = async () => {
    if (!raw.trim()) { toast.error("Escreva algum conteúdo"); return; }
    const tags = tagsStr.split(",").map((s: string) => s.trim()).filter(Boolean);
    const payload = { category, raw_content: raw, tags };
    if (editing?.id) {
      await (supabase as any).from("arsenal_entries").update(payload).eq("id", editing.id);
    } else {
      await (supabase as any).from("arsenal_entries").insert({ ...payload, user_id: userId });
    }
    toast.success(editing ? "Atualizado" : "Salvo");
    onSaved();
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Editar entrada" : "Nova entrada"} wide>
      <Field label="Categoria">
        <select className={inputCls} value={category} onChange={(ev) => setCategory(ev.target.value)}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Conteúdo *">
        <textarea rows={6} className={inputCls} value={raw} onChange={(ev) => setRaw(ev.target.value)} autoFocus />
      </Field>
      <Field label="Tags (separadas por vírgula)">
        <input className={inputCls} value={tagsStr} onChange={(ev) => setTagsStr(ev.target.value)} placeholder="ex: vendas, autoridade, história" />
      </Field>
      <div className="flex gap-2 justify-end mt-4">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={save}>Salvar</Btn>
      </div>
    </Modal>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Field, inputCls, Modal, Tag, EmptyState, Chip } from "@/components/ui-custom";
import { toast } from "sonner";
import { X } from "lucide-react";

const STORY_TYPES = [
  { key: "criacao", label: "🌱 Criação", color: "sage" },
  { key: "empatia", label: "💛 Empatia", color: "blush" },
  { key: "trofeu", label: "🏆 Troféu", color: "gold" },
  { key: "transformacao", label: "✨ Transformação", color: "terracota" },
  { key: "aprendizado", label: "💡 Aprendizado", color: "blue" },
  { key: "outro", label: "📖 Outro", color: "neutral" },
];

export function StoriesBank({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filter, setFilter] = useState<string>("todos");

  const load = async () => {
    const { data } = await (supabase as any)
      .from("stories")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    await (supabase as any).from("stories").delete().eq("id", id);
    toast.success("Removida");
    load();
  };

  const list = filter === "todos" ? items : items.filter((i) => i.story_type === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-2 overflow-x-auto items-center">
          <span className="label-mono mr-1">Tipo:</span>
          <Chip active={filter === "todos"} onClick={() => setFilter("todos")}>Todas</Chip>
          {STORY_TYPES.map((t) => (
            <Chip key={t.key} active={filter === t.key} onClick={() => setFilter(t.key)}>{t.label}</Chip>
          ))}
        </div>
        <Btn onClick={() => { setEditing(null); setOpen(true); }}>+ Nova história</Btn>
      </div>

      {list.length === 0 ? (
        <EmptyState icon="📖" text="Seu banco de histórias está vazio. Comece registrando uma." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {list.map((s) => {
            const t = STORY_TYPES.find((x) => x.key === s.story_type);
            return (
              <div
                key={s.id}
                onClick={() => { setEditing(s); setOpen(true); }}
                className="bg-bg-primary border border-border rounded-lg p-4 cursor-pointer hover:border-terracota/50 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-display text-lg flex-1">{s.title}</div>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); remove(s.id); }}
                    className="text-text-tertiary hover:text-[#e05c5c]"
                  >
                    <X size={14} />
                  </button>
                </div>
                {t && <div className="mt-1"><Tag color={t.color}>{t.label}</Tag></div>}
                {s.description && (
                  <div className="text-sm text-text-secondary mt-2 line-clamp-4 whitespace-pre-wrap">
                    {s.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <StoryModal
          userId={userId}
          editing={editing}
          onClose={() => setOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function StoryModal({ userId, editing, onClose, onSaved }: any) {
  const e = editing ?? {};
  const [title, setTitle] = useState(e.title ?? "");
  const [description, setDescription] = useState(e.description ?? "");
  const [storyType, setStoryType] = useState(e.story_type ?? "outro");

  const save = async () => {
    if (!title.trim()) { toast.error("Dê um título"); return; }
    const payload = { title, description, story_type: storyType };
    if (editing?.id) {
      await (supabase as any).from("stories").update(payload).eq("id", editing.id);
    } else {
      await (supabase as any).from("stories").insert({ ...payload, user_id: userId });
    }
    toast.success(editing ? "Atualizada" : "Salva");
    onSaved();
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Editar história" : "Nova história"} wide>
      <Field label="Título *">
        <input className={inputCls} value={title} onChange={(ev) => setTitle(ev.target.value)} autoFocus />
      </Field>
      <Field label="Tipo">
        <select className={inputCls} value={storyType} onChange={(ev) => setStoryType(ev.target.value)}>
          {STORY_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </Field>
      <Field label="Descrição">
        <textarea rows={8} className={inputCls} value={description} onChange={(ev) => setDescription(ev.target.value)} />
      </Field>
      <div className="flex gap-2 justify-end mt-4">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={save}>Salvar</Btn>
      </div>
    </Modal>
  );
}

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Field, inputCls, Modal, Tag, EmptyState, Chip } from "@/components/ui-custom";
import { toast } from "sonner";
import { X, Pencil } from "lucide-react";

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

type Pilar = { id: string; nome: string; descricao: string | null };

export function Arsenal({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [pilares, setPilares] = useState<Pilar[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [presetPilar, setPresetPilar] = useState<string | null>(null);
  const [pilaresOpen, setPilaresOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<"categoria" | "pilar">("categoria");
  const [filter, setFilter] = useState<string>("todos");

  const load = async () => {
    const [{ data }, { data: p }] = await Promise.all([
      (supabase as any).from("arsenal_entries").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("pilares_conteudo").select("*").order("nome"),
    ]);
    setItems(data ?? []);
    setPilares((p ?? []) as Pilar[]);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    await (supabase as any).from("arsenal_entries").delete().eq("id", id);
    toast.success("Removido");
    load();
  };

  const pilarName = (id: string | null) => pilares.find((p) => p.id === id)?.nome ?? null;

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    const list = items.filter((i) => {
      if (filter === "todos") return true;
      return groupBy === "categoria" ? i.category === filter : i.pilar_id === filter;
    });
    list.forEach((i) => {
      const key = groupBy === "categoria"
        ? i.category
        : (pilarName(i.pilar_id) ?? "Sem pilar");
      (g[key] ||= []).push(i);
    });
    return g;
  }, [items, filter, groupBy, pilares]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1 bg-bg-secondary rounded-lg p-1">
          <button onClick={() => { setGroupBy("categoria"); setFilter("todos"); }} className={`px-3 py-1.5 rounded text-xs font-mono ${groupBy === "categoria" ? "bg-dark text-bg-primary" : "text-text-secondary"}`}>Por categoria</button>
          <button onClick={() => { setGroupBy("pilar"); setFilter("todos"); }} className={`px-3 py-1.5 rounded text-xs font-mono ${groupBy === "pilar" ? "bg-dark text-bg-primary" : "text-text-secondary"}`}>Por pilar</button>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => setPilaresOpen(true)}>Pilares</Btn>
          <Btn onClick={() => { setEditing(null); setPresetPilar(null); setOpen(true); }}>+ Nova entrada</Btn>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto items-center mb-4 pb-1">
        <span className="label-mono mr-1">{groupBy === "categoria" ? "Categoria:" : "Pilar:"}</span>
        <Chip active={filter === "todos"} onClick={() => setFilter("todos")}>Todos</Chip>
        {groupBy === "categoria"
          ? CATEGORIES.map((c) => (
              <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>{c}</Chip>
            ))
          : pilares.map((p) => (
              <Chip key={p.id} active={filter === p.id} onClick={() => setFilter(p.id)}>{p.nome}</Chip>
            ))}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <EmptyState icon="🗂" text="Nenhuma entrada ainda. Comece o seu arsenal." />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([key, list]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <div className="label-mono">{key} <span className="text-text-tertiary">({list.length})</span></div>
                {groupBy === "pilar" && key !== "Sem pilar" && (
                  <button
                    className="text-xs font-mono text-terracota"
                    onClick={() => {
                      const p = pilares.find((x) => x.nome === key);
                      setEditing(null); setPresetPilar(p?.id ?? null); setOpen(true);
                    }}
                  >+ ideia neste pilar</button>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {list.map((e) => (
                  <div
                    key={e.id}
                    className="bg-bg-primary border border-border rounded-lg p-4 cursor-pointer hover:border-terracota/50 transition"
                    onClick={() => { setEditing(e); setPresetPilar(null); setOpen(true); }}
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
                    <div className="flex flex-wrap gap-1 mt-3">
                      <Tag color="neutral">{e.category}</Tag>
                      {e.pilar_id && pilarName(e.pilar_id) && <Tag color="sage">{pilarName(e.pilar_id)}</Tag>}
                      {e.tags?.map((t: string, i: number) => (
                        <Tag key={i} color={TAG_COLORS[i % TAG_COLORS.length]}>{t}</Tag>
                      ))}
                    </div>
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
          pilares={pilares}
          presetPilar={presetPilar}
          onClose={() => setOpen(false)}
          onSaved={load}
        />
      )}

      {pilaresOpen && (
        <PilaresModal
          userId={userId}
          pilares={pilares}
          items={items}
          onClose={() => setPilaresOpen(false)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function PilaresModal({ userId, pilares, items, onClose, onChanged }: any) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const reset = () => { setNome(""); setDescricao(""); setEditId(null); };

  const save = async () => {
    if (!nome.trim()) { toast.error("Informe o nome do pilar"); return; }
    if (editId) {
      await (supabase as any).from("pilares_conteudo").update({ nome, descricao: descricao || null }).eq("id", editId);
      toast.success("Pilar atualizado");
    } else {
      await (supabase as any).from("pilares_conteudo").insert({ user_id: userId, nome, descricao: descricao || null });
      toast.success("Pilar criado");
    }
    reset();
    onChanged();
  };

  const remove = async (id: string) => {
    await (supabase as any).from("pilares_conteudo").delete().eq("id", id);
    toast.success("Pilar excluído (as ideias foram mantidas)");
    if (editId === id) reset();
    onChanged();
  };

  return (
    <Modal open onClose={onClose} title="Pilares de conteúdo" wide>
      <div className="grid md:grid-cols-2 gap-x-4">
        <Field label="Nome do pilar *">
          <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex: Pilar 1 - Autoconhecimento" />
        </Field>
        <Field label="Descrição (opcional)">
          <input className={inputCls} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2 justify-end mb-5">
        {editId && <Btn variant="ghost" onClick={reset}>Cancelar edição</Btn>}
        <Btn onClick={save}>{editId ? "Salvar pilar" : "+ Adicionar pilar"}</Btn>
      </div>

      <div className="space-y-3">
        {pilares.length === 0 ? (
          <div className="text-sm text-text-tertiary">Nenhum pilar cadastrado ainda.</div>
        ) : pilares.map((p: Pilar) => {
          const ideias = items.filter((i: any) => i.pilar_id === p.id);
          return (
            <div key={p.id} className="border border-border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-sm">{p.nome}</div>
                  {p.descricao && <div className="text-xs text-text-secondary">{p.descricao}</div>}
                  <div className="label-mono mt-1 text-text-tertiary">{ideias.length} ideia(s)</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditId(p.id); setNome(p.nome); setDescricao(p.descricao ?? ""); }} className="text-text-tertiary hover:text-terracota"><Pencil size={14} /></button>
                  <button onClick={() => remove(p.id)} className="text-text-tertiary hover:text-[#e05c5c]"><X size={14} /></button>
                </div>
              </div>
              {ideias.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {ideias.map((i: any) => (
                    <li key={i.id} className="text-xs text-text-secondary line-clamp-1">• {i.raw_content}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end mt-4">
        <Btn variant="ghost" onClick={onClose}>Fechar</Btn>
      </div>
    </Modal>
  );
}

function ArsenalModal({ userId, editing, pilares, presetPilar, onClose, onSaved }: any) {
  const e = editing ?? {};
  const [category, setCategory] = useState(e.category ?? CATEGORIES[0]);
  const [pilarId, setPilarId] = useState<string>(e.pilar_id ?? presetPilar ?? "");
  const [raw, setRaw] = useState(e.raw_content ?? "");
  const [tagsStr, setTagsStr] = useState((e.tags ?? []).join(", "));

  const save = async () => {
    if (!raw.trim()) { toast.error("Escreva algum conteúdo"); return; }
    const tags = tagsStr.split(",").map((s: string) => s.trim()).filter(Boolean);
    const payload = { category, raw_content: raw, tags, pilar_id: pilarId || null };
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
      <div className="grid md:grid-cols-2 gap-x-4">
        <Field label="Categoria">
          <select className={inputCls} value={category} onChange={(ev) => setCategory(ev.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Pilar (opcional)">
          <select className={inputCls} value={pilarId} onChange={(ev) => setPilarId(ev.target.value)}>
            <option value="">Sem pilar</option>
            {pilares.map((p: Pilar) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Field>
      </div>
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

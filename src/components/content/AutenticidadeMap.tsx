import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inputCls, Btn, Chip } from "@/components/ui-custom";
import { PromptBox } from "./PromptBox";
import { toast } from "sonner";
import { Copy, Download, Check } from "lucide-react";

const CRIACAO = [
  "Qual foi o momento em que você decidiu criar algo seu?",
  "O que estava acontecendo na sua vida naquela época?",
  "Qual dor ou incômodo te empurrou pra fora do lugar?",
  "Quais foram os primeiros passos que você deu?",
  "Quem te apoiou (ou não) nesse começo?",
  "O que você aprendeu sobre si mesma nessa criação?",
];
const EMPATIA = [
  "Descreva uma dor que você viveu e hoje ajuda outras pessoas a atravessarem.",
  "Como você se sentia naquele momento?",
  "O que teria mudado tudo se alguém tivesse te dito?",
  "Como você atravessou essa fase?",
  "Que ponte essa história constrói com o seu público?",
];
const TROFEU = [
  "Qual foi uma conquista da qual você tem muito orgulho?",
  "O que precisou acontecer pra você chegar lá?",
  "Quem você se tornou nesse processo?",
  "Qual habilidade você desenvolveu?",
  "Como essa vitória prova o que você entrega hoje?",
];

const INTERESSES_CATS = ["Entretenimento", "Animais", "Lazer", "Prazeres", "Referências"];

const DESCOBERTA = [
  "Qual padrão você vê entre suas histórias de criação, empatia e troféu?",
  "Qual valor aparece em todas elas?",
  "Qual é a transformação que você provoca nas pessoas?",
  "Qual é a promessa central do seu trabalho?",
  "Se você tivesse que resumir seu propósito em uma frase, qual seria?",
];

const PREMISSAS_LABELS = [
  "Premissa 1",
  "Premissa 2",
  "Premissa 3",
  "Premissa 4",
  "Premissa 5",
  "Premissa 6",
  "Premissa 7",
  "Premissa 8",
];

type MapData = {
  historias?: {
    criacao?: string[];
    empatia?: string[];
    trofeu?: string[];
    prompt_response?: string;
  };
  essencia?: {
    tom_voz?: string;
    visual?: string;
    interesses?: Record<string, string>;
    diferencial_qualidades?: string;
    diferencial_valores?: string;
    diferencial_skills?: string;
    publico?: string;
    produto?: string;
    prompt_response?: string;
  };
  narrativa?: {
    descoberta?: string[];
    big_idea?: string;
    premissas?: string[];
    prompt_response?: string;
  };
  expressao?: {
    ideias?: string[];
    prompt_response?: string;
  };
};

const PHASES = ["Histórias", "Essência", "Narrativa", "Expressão", "Mapa Final"];

export function AutenticidadeMap({ userId }: { userId: string }) {
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<MapData>({});
  const [phase, setPhase] = useState(1);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initial = useRef(true);

  useEffect(() => {
    (async () => {
      const { data: row } = await (supabase as any)
        .from("autenticidade_maps")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (row) {
        setData(row.data ?? {});
        setPhase(row.current_phase ?? 1);
      } else {
        await (supabase as any)
          .from("autenticidade_maps")
          .insert({ user_id: userId, data: {}, current_phase: 1 });
      }
      setLoaded(true);
      initial.current = false;
    })();
  }, [userId]);

  useEffect(() => {
    if (!loaded || initial.current) return;
    if (timer.current) clearTimeout(timer.current);
    setSaving(true);
    timer.current = setTimeout(async () => {
      await (supabase as any)
        .from("autenticidade_maps")
        .update({ data, current_phase: phase })
        .eq("user_id", userId);
      setSaving(false);
    }, 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [data, phase, loaded, userId]);

  const update = (fn: (d: MapData) => MapData) => setData((prev) => fn({ ...prev }));

  if (!loaded) return <div className="text-text-tertiary py-8 text-center">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-2 overflow-x-auto">
          {PHASES.map((p, i) => (
            <Chip key={p} active={phase === i + 1} onClick={() => setPhase(i + 1)}>
              {i + 1}. {p}
            </Chip>
          ))}
        </div>
        <div className="text-xs font-mono text-text-tertiary">
          {saving ? "Salvando..." : "✓ Salvo"}
        </div>
      </div>

      <div className="bg-bg-primary border border-border rounded-xl p-5">
        {phase === 1 && <PhaseHistorias data={data} update={update} />}
        {phase === 2 && <PhaseEssencia data={data} update={update} />}
        {phase === 3 && <PhaseNarrativa data={data} update={update} />}
        {phase === 4 && <PhaseExpressao data={data} update={update} />}
        {phase === 5 && <PhaseMapaFinal data={data} />}

        <div className="flex justify-between mt-6 pt-4 border-t border-border">
          <Btn variant="ghost" onClick={() => setPhase(Math.max(1, phase - 1))} disabled={phase === 1}>
            ← Anterior
          </Btn>
          <Btn onClick={() => setPhase(Math.min(5, phase + 1))} disabled={phase === 5}>
            Próximo →
          </Btn>
        </div>
      </div>
    </div>
  );
}

function SlideBlock({
  title,
  questions,
  values,
  onChange,
}: {
  title: string;
  questions: string[];
  values: string[];
  onChange: (i: number, v: string) => void;
}) {
  const [slide, setSlide] = useState(0);
  const cur = Math.min(slide, questions.length - 1);
  return (
    <div className="border border-border rounded-lg p-4 bg-bg-secondary/30">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-lg">{title}</div>
        <div className="text-xs font-mono text-text-tertiary">
          {cur + 1} / {questions.length}
        </div>
      </div>
      <div className="label-mono mb-2">{questions[cur]}</div>
      <textarea
        rows={4}
        value={values[cur] ?? ""}
        onChange={(e) => onChange(cur, e.target.value)}
        className={inputCls}
      />
      <div className="flex justify-between mt-3">
        <button
          type="button"
          onClick={() => setSlide(Math.max(0, cur - 1))}
          disabled={cur === 0}
          className="text-xs font-mono text-text-secondary disabled:opacity-30"
        >
          ← Anterior
        </button>
        <button
          type="button"
          onClick={() => setSlide(Math.min(questions.length - 1, cur + 1))}
          disabled={cur === questions.length - 1}
          className="text-xs font-mono text-terracota disabled:opacity-30"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
}

function PhaseHistorias({ data, update }: any) {
  const h = data.historias ?? {};
  const setArr = (k: "criacao" | "empatia" | "trofeu", i: number, v: string) => {
    update((d: MapData) => {
      const cur = { ...(d.historias ?? {}) };
      const arr = [...((cur as any)[k] ?? [])];
      arr[i] = v;
      (cur as any)[k] = arr;
      d.historias = cur;
      return d;
    });
  };
  const prompt = `Sou uma empreendedora criando meu mapa de autenticidade. Analise minhas 3 histórias e me ajude a identificar os padrões, valores e o fio narrativo que as conecta:

HISTÓRIA DE CRIAÇÃO:
${(h.criacao ?? []).filter(Boolean).map((s: string, i: number) => `${i + 1}. ${CRIACAO[i]}\n→ ${s}`).join("\n\n")}

HISTÓRIA DE EMPATIA:
${(h.empatia ?? []).filter(Boolean).map((s: string, i: number) => `${i + 1}. ${EMPATIA[i]}\n→ ${s}`).join("\n\n")}

HISTÓRIA DE TROFÉU:
${(h.trofeu ?? []).filter(Boolean).map((s: string, i: number) => `${i + 1}. ${TROFEU[i]}\n→ ${s}`).join("\n\n")}`;

  return (
    <div className="space-y-4">
      <div>
        <div className="font-display text-2xl mb-1">1. Histórias</div>
        <div className="text-sm text-text-secondary">
          Três histórias que revelam quem você é: como começou, o que atravessou e onde chegou.
        </div>
      </div>
      <SlideBlock title="🌱 Criação" questions={CRIACAO} values={h.criacao ?? []} onChange={(i, v) => setArr("criacao", i, v)} />
      <SlideBlock title="💛 Empatia" questions={EMPATIA} values={h.empatia ?? []} onChange={(i, v) => setArr("empatia", i, v)} />
      <SlideBlock title="🏆 Troféu" questions={TROFEU} values={h.trofeu ?? []} onChange={(i, v) => setArr("trofeu", i, v)} />
      <PromptBox
        prompt={prompt}
        value={h.prompt_response ?? ""}
        onChange={(v) => update((d: MapData) => ({ ...d, historias: { ...(d.historias ?? {}), prompt_response: v } }))}
      />
    </div>
  );
}

function PhaseEssencia({ data, update }: any) {
  const e = data.essencia ?? {};
  const [sub, setSub] = useState<"voz" | "interesses" | "diferencial" | "publico">("voz");
  const setField = (k: string, v: string) =>
    update((d: MapData) => ({ ...d, essencia: { ...(d.essencia ?? {}), [k]: v } }));
  const setInteresse = (cat: string, v: string) =>
    update((d: MapData) => ({
      ...d,
      essencia: {
        ...(d.essencia ?? {}),
        interesses: { ...((d.essencia?.interesses) ?? {}), [cat]: v },
      },
    }));

  const prompt = `A partir das informações abaixo, me ajude a descrever minha essência de marca de forma clara:

TOM DE VOZ: ${e.tom_voz ?? ""}
VISUAL: ${e.visual ?? ""}

INTERESSES:
${INTERESSES_CATS.map((c) => `- ${c}: ${e.interesses?.[c] ?? ""}`).join("\n")}

DIFERENCIAL:
- Qualidades: ${e.diferencial_qualidades ?? ""}
- Valores: ${e.diferencial_valores ?? ""}
- Skills: ${e.diferencial_skills ?? ""}

PÚBLICO-ALVO: ${e.publico ?? ""}
PRODUTO/SERVIÇO: ${e.produto ?? ""}`;

  return (
    <div>
      <div className="font-display text-2xl mb-1">2. Essência</div>
      <div className="text-sm text-text-secondary mb-4">O que te distingue: voz, gostos, diferencial e a quem você fala.</div>

      <div className="flex gap-2 flex-wrap mb-4">
        <Chip active={sub === "voz"} onClick={() => setSub("voz")}>Tom & Visual</Chip>
        <Chip active={sub === "interesses"} onClick={() => setSub("interesses")}>Interesses</Chip>
        <Chip active={sub === "diferencial"} onClick={() => setSub("diferencial")}>Diferencial</Chip>
        <Chip active={sub === "publico"} onClick={() => setSub("publico")}>Público & Produto</Chip>
      </div>

      {sub === "voz" && (
        <div className="space-y-3">
          <div>
            <div className="label-mono mb-1.5">Tom de voz</div>
            <textarea rows={3} className={inputCls} value={e.tom_voz ?? ""} onChange={(ev) => setField("tom_voz", ev.target.value)} />
          </div>
          <div>
            <div className="label-mono mb-1.5">Identidade visual</div>
            <textarea rows={3} className={inputCls} value={e.visual ?? ""} onChange={(ev) => setField("visual", ev.target.value)} />
          </div>
        </div>
      )}

      {sub === "interesses" && (
        <div className="space-y-3">
          {INTERESSES_CATS.map((c) => (
            <div key={c}>
              <div className="label-mono mb-1.5">{c}</div>
              <textarea rows={2} className={inputCls} value={e.interesses?.[c] ?? ""} onChange={(ev) => setInteresse(c, ev.target.value)} />
            </div>
          ))}
        </div>
      )}

      {sub === "diferencial" && (
        <div className="space-y-3">
          <div>
            <div className="label-mono mb-1.5">Qualidades</div>
            <textarea rows={2} className={inputCls} value={e.diferencial_qualidades ?? ""} onChange={(ev) => setField("diferencial_qualidades", ev.target.value)} />
          </div>
          <div>
            <div className="label-mono mb-1.5">Valores</div>
            <textarea rows={2} className={inputCls} value={e.diferencial_valores ?? ""} onChange={(ev) => setField("diferencial_valores", ev.target.value)} />
          </div>
          <div>
            <div className="label-mono mb-1.5">Skills</div>
            <textarea rows={2} className={inputCls} value={e.diferencial_skills ?? ""} onChange={(ev) => setField("diferencial_skills", ev.target.value)} />
          </div>
        </div>
      )}

      {sub === "publico" && (
        <div className="space-y-3">
          <div>
            <div className="label-mono mb-1.5">Público-alvo</div>
            <textarea rows={3} className={inputCls} value={e.publico ?? ""} onChange={(ev) => setField("publico", ev.target.value)} />
          </div>
          <div>
            <div className="label-mono mb-1.5">Produto / Serviço</div>
            <textarea rows={3} className={inputCls} value={e.produto ?? ""} onChange={(ev) => setField("produto", ev.target.value)} />
          </div>
        </div>
      )}

      <PromptBox
        prompt={prompt}
        value={e.prompt_response ?? ""}
        onChange={(v) => setField("prompt_response", v)}
      />
    </div>
  );
}

function PhaseNarrativa({ data, update }: any) {
  const n = data.narrativa ?? {};
  const h = data.historias ?? {};
  const setDesc = (i: number, v: string) =>
    update((d: MapData) => {
      const arr = [...((d.narrativa?.descoberta) ?? [])];
      arr[i] = v;
      return { ...d, narrativa: { ...(d.narrativa ?? {}), descoberta: arr } };
    });
  const setPrem = (i: number, v: string) =>
    update((d: MapData) => {
      const arr = [...((d.narrativa?.premissas) ?? [])];
      arr[i] = v;
      return { ...d, narrativa: { ...(d.narrativa ?? {}), premissas: arr } };
    });
  const setField = (k: string, v: string) =>
    update((d: MapData) => ({ ...d, narrativa: { ...(d.narrativa ?? {}), [k]: v } }));

  const contexto = `Contexto das minhas histórias:
- Criação: ${(h.criacao ?? []).filter(Boolean).join(" | ")}
- Empatia: ${(h.empatia ?? []).filter(Boolean).join(" | ")}
- Troféu: ${(h.trofeu ?? []).filter(Boolean).join(" | ")}`;

  const prompt = `${contexto}

Com base nisso, me ajude a formular minha Big Idea (a ideia central que sustenta tudo) e refinar as premissas abaixo:

DESCOBERTA:
${DESCOBERTA.map((q, i) => `${i + 1}. ${q}\n→ ${n.descoberta?.[i] ?? ""}`).join("\n\n")}

BIG IDEA: ${n.big_idea ?? ""}

PREMISSAS:
${PREMISSAS_LABELS.map((l, i) => `- ${l}: ${n.premissas?.[i] ?? ""}`).join("\n")}`;

  return (
    <div>
      <div className="font-display text-2xl mb-1">3. Narrativa</div>
      <div className="text-sm text-text-secondary mb-4">A ideia central e as premissas que sustentam sua comunicação.</div>

      <div className="mb-4 p-3 bg-bg-secondary rounded-lg text-xs text-text-secondary">
        💡 Baseado nas suas histórias da Fase 1
      </div>

      <div className="space-y-3 mb-5">
        <div className="label-mono">Descoberta</div>
        {DESCOBERTA.map((q, i) => (
          <div key={i}>
            <div className="text-sm text-text-secondary mb-1">{i + 1}. {q}</div>
            <textarea rows={2} className={inputCls} value={n.descoberta?.[i] ?? ""} onChange={(e) => setDesc(i, e.target.value)} />
          </div>
        ))}
      </div>

      <div className="mb-5">
        <div className="label-mono mb-1.5">✨ Big Idea</div>
        <textarea rows={3} className={inputCls} value={n.big_idea ?? ""} onChange={(e) => setField("big_idea", e.target.value)} placeholder="A ideia central que sustenta tudo que você comunica..." />
      </div>

      <div className="space-y-2 mb-4">
        <div className="label-mono">Premissas (8)</div>
        {PREMISSAS_LABELS.map((l, i) => (
          <div key={i}>
            <div className="text-xs font-mono text-text-tertiary mb-1">{l}</div>
            <textarea rows={2} className={inputCls} value={n.premissas?.[i] ?? ""} onChange={(e) => setPrem(i, e.target.value)} />
          </div>
        ))}
      </div>

      <PromptBox
        prompt={prompt}
        value={n.prompt_response ?? ""}
        onChange={(v) => setField("prompt_response", v)}
      />
    </div>
  );
}

function PhaseExpressao({ data, update }: any) {
  const x = data.expressao ?? {};
  const setIdea = (i: number, v: string) =>
    update((d: MapData) => {
      const arr = [...((d.expressao?.ideias) ?? [])];
      arr[i] = v;
      return { ...d, expressao: { ...(d.expressao ?? {}), ideias: arr } };
    });
  const setField = (k: string, v: string) =>
    update((d: MapData) => ({ ...d, expressao: { ...(d.expressao ?? {}), [k]: v } }));

  const prompt = `Com base em tudo que preenchi antes (histórias, essência, big idea e premissas), me sugira 5 ideias de conteúdo alinhadas com minha autenticidade.

Contexto resumido:
- Big Idea: ${data.narrativa?.big_idea ?? ""}
- Premissas: ${(data.narrativa?.premissas ?? []).filter(Boolean).join(" | ")}
- Tom: ${data.essencia?.tom_voz ?? ""}
- Público: ${data.essencia?.publico ?? ""}

Minhas ideias atuais:
${[0, 1, 2, 3, 4].map((i) => `${i + 1}. ${x.ideias?.[i] ?? ""}`).join("\n")}`;

  return (
    <div>
      <div className="font-display text-2xl mb-1">4. Expressão</div>
      <div className="text-sm text-text-secondary mb-4">5 ideias de conteúdo alinhadas com tudo que você construiu.</div>

      <div className="space-y-3 mb-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="label-mono mb-1.5">Ideia {i + 1}</div>
            <textarea rows={3} className={inputCls} value={x.ideias?.[i] ?? ""} onChange={(e) => setIdea(i, e.target.value)} />
          </div>
        ))}
      </div>

      <PromptBox
        prompt={prompt}
        value={x.prompt_response ?? ""}
        onChange={(v) => setField("prompt_response", v)}
      />
    </div>
  );
}

function PhaseMapaFinal({ data }: { data: MapData }) {
  const md = useMemo(() => buildMarkdown(data), [data]);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(md);
    setCopied(true);
    toast.success("Mapa copiado");
    setTimeout(() => setCopied(false), 1500);
  };
  const download = () => {
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mapa-autenticidade.md";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <div className="font-display text-2xl mb-1">5. Mapa Final</div>
      <div className="text-sm text-text-secondary mb-4">
        Seu mapa consolidado. Copie ou baixe para usar em qualquer lugar.
      </div>
      <div className="flex gap-2 mb-3">
        <Btn onClick={copy}>
          {copied ? <Check size={14} className="inline mr-1" /> : <Copy size={14} className="inline mr-1" />}
          Copiar
        </Btn>
        <Btn variant="ghost" onClick={download}>
          <Download size={14} className="inline mr-1" />
          Baixar .md
        </Btn>
      </div>
      <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-xs whitespace-pre-wrap font-mono max-h-[500px] overflow-y-auto">
        {md}
      </pre>
    </div>
  );
}

function buildMarkdown(d: MapData): string {
  const h = d.historias ?? {};
  const e = d.essencia ?? {};
  const n = d.narrativa ?? {};
  const x = d.expressao ?? {};
  const list = (arr: string[] | undefined, labels: string[]) =>
    labels.map((l, i) => `- **${l}**: ${arr?.[i] ?? ""}`).join("\n");
  return `# Mapa da Autenticidade

## 1. Histórias

### 🌱 Criação
${list(h.criacao, CRIACAO)}

### 💛 Empatia
${list(h.empatia, EMPATIA)}

### 🏆 Troféu
${list(h.trofeu, TROFEU)}

${h.prompt_response ? `**Síntese IA:**\n${h.prompt_response}\n` : ""}

## 2. Essência
- **Tom de voz:** ${e.tom_voz ?? ""}
- **Visual:** ${e.visual ?? ""}

### Interesses
${INTERESSES_CATS.map((c) => `- **${c}:** ${e.interesses?.[c] ?? ""}`).join("\n")}

### Diferencial
- **Qualidades:** ${e.diferencial_qualidades ?? ""}
- **Valores:** ${e.diferencial_valores ?? ""}
- **Skills:** ${e.diferencial_skills ?? ""}

### Público & Produto
- **Público-alvo:** ${e.publico ?? ""}
- **Produto/Serviço:** ${e.produto ?? ""}

${e.prompt_response ? `**Síntese IA:**\n${e.prompt_response}\n` : ""}

## 3. Narrativa

### Descoberta
${list(n.descoberta, DESCOBERTA)}

### ✨ Big Idea
${n.big_idea ?? ""}

### Premissas
${list(n.premissas, PREMISSAS_LABELS)}

${n.prompt_response ? `**Síntese IA:**\n${n.prompt_response}\n` : ""}

## 4. Expressão — Ideias de Conteúdo
${[0, 1, 2, 3, 4].map((i) => `${i + 1}. ${x.ideias?.[i] ?? ""}`).join("\n")}

${x.prompt_response ? `\n**Síntese IA:**\n${x.prompt_response}\n` : ""}
`;
}

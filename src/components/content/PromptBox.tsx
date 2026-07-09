import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { inputCls } from "@/components/ui-custom";
import { toast } from "sonner";

export function PromptBox({
  label = "Prompt sugerido",
  prompt,
  value,
  onChange,
  placeholder = "Cole aqui a resposta do ChatGPT/Claude...",
}: {
  label?: string;
  prompt: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    toast.success("Prompt copiado");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="mt-4 border border-border rounded-xl p-4 bg-bg-secondary/50">
      <div className="flex items-center justify-between mb-2">
        <div className="label-mono">✨ {label}</div>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg bg-terracota text-bg-primary hover:bg-terracota-light transition"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copiado" : "Copiar Prompt"}
        </button>
      </div>
      <textarea
        readOnly
        value={prompt}
        rows={4}
        className={`${inputCls} text-xs font-mono bg-bg-primary`}
      />
      <div className="label-mono mt-3 mb-1.5">Resposta da IA</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

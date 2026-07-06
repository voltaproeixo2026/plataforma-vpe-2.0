import { type ReactNode, useEffect, useState, type KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl text-text-primary">{title}</h1>
        {subtitle && <p className="label-mono mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="label-mono mb-3">{children}</div>;
}

export function MetricCard({ label, value, sub, color = "terracota" }: { label: string; value: ReactNode; sub?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    terracota: "var(--terracota)", sage: "var(--sage)", gold: "var(--gold)",
    blue: "var(--blue)", blush: "var(--blush)", amber: "var(--amber)",
  };
  return (
    <div className="bg-bg-primary border border-border rounded-xl p-5 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: colorMap[color] }} />
      <div className="label-mono">{label}</div>
      <div className="font-display text-3xl mt-2 text-text-primary">{value}</div>
      {sub && <div className="text-sm text-text-secondary mt-1">{sub}</div>}
    </div>
  );
}

export function ProgressBar({ value, max, leftLabel, rightLabel, color = "var(--terracota)" }: { value: number; max: number; leftLabel?: string; rightLabel?: string; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 50); return () => clearTimeout(t); }, [pct]);
  return (
    <div>
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-text-secondary">{leftLabel}</span>
          <span className="font-mono text-text-primary">{rightLabel}</span>
        </div>
      )}
      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div className="h-full rounded-full anim-bar" style={{ width: `${w}%`, background: color }} />
      </div>
    </div>
  );
}

const tagColors: Record<string, string> = {
  terracota: "bg-[#C4714A]/15 text-[#C4714A] border-[#C4714A]/30",
  sage: "bg-[#7A8C6E]/15 text-[#7A8C6E] border-[#7A8C6E]/30",
  gold: "bg-[#C9A96E]/15 text-[#9b7d3f] border-[#C9A96E]/30",
  blue: "bg-[#5B6FA8]/15 text-[#5B6FA8] border-[#5B6FA8]/30",
  blush: "bg-[#D4A5A0]/20 text-[#b07670] border-[#D4A5A0]/40",
  amber: "bg-[#E8A838]/15 text-[#a8771f] border-[#E8A838]/30",
  dark: "bg-dark text-bg-primary border-dark",
  neutral: "bg-bg-tertiary text-text-secondary border-border",
};

export function Tag({ children, color = "neutral" }: { children: ReactNode; color?: string }) {
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-mono border ${tagColors[color] ?? tagColors.neutral}`}>{children}</span>;
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-bg-primary rounded-2xl border border-border p-6 w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">{title}</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <div className="label-mono mb-1.5">{label}</div>
      {children}
    </label>
  );
}

export const inputCls = "w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary focus:outline-none focus:border-terracota transition";

export function Btn({ children, variant = "primary", className = "", ...p }: any) {
  const v: Record<string, string> = {
    primary: "bg-terracota text-bg-primary hover:bg-terracota-light",
    dark: "bg-dark text-bg-primary hover:opacity-90",
    ghost: "bg-bg-secondary text-text-primary hover:bg-bg-tertiary border border-border",
    sage: "bg-sage text-bg-primary hover:bg-sage-light",
    danger: "bg-[#e05c5c] text-bg-primary hover:opacity-90",
  };
  return <button {...p} className={`px-4 py-2 rounded-lg font-mono text-sm transition ${v[variant]} ${className}`}>{children}</button>;
}

export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-center py-12 text-text-tertiary">
      <div className="text-4xl mb-2">{icon}</div>
      <div className="font-mono text-sm">{text}</div>
    </div>
  );
}

export function ToggleList({ items, onAdd, onRemove, placeholder = "Adicionar..." }: { items: string[]; onAdd: (s: string) => void; onRemove: (i: number) => void; placeholder?: string }) {
  const [v, setV] = useState("");
  const add = () => { const t = v.trim(); if (t) { onAdd(t); setV(""); } };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); add(); } };
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input className={inputCls} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={onKey} placeholder={placeholder} />
        <button type="button" onClick={add} className="px-3 rounded-lg bg-terracota text-bg-primary"><Plus size={16} /></button>
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-terracota" />
            <span className="flex-1">{it}</span>
            <button type="button" onClick={() => onRemove(i)} className="text-text-tertiary hover:text-text-primary"><X size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CounterCard({ label, value, onInc, onDec, sub }: { label: string; value: number; onInc: () => void; onDec: () => void; sub?: string }) {
  return (
    <div className="bg-dark text-bg-primary rounded-2xl p-6">
      <div className="label-mono text-bg-tertiary">{label}</div>
      <div className="flex items-center justify-between mt-4">
        <button onClick={onDec} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-xl">−</button>
        <div className="font-display text-5xl">{value}</div>
        <button onClick={onInc} className="w-10 h-10 rounded-full bg-terracota hover:bg-terracota-light text-xl">+</button>
      </div>
      {sub && <div className="text-xs mt-3 text-bg-tertiary/80 text-center">{sub}</div>}
    </div>
  );
}

export function Chip({ active, onClick, children }: any) {
  return <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-mono whitespace-nowrap border transition ${active ? "bg-dark text-bg-primary border-dark" : "bg-bg-primary border-border text-text-secondary hover:border-text-secondary"}`}>{children}</button>;
}

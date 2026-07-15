import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Home, CheckSquare, Calendar, Users, Workflow, MessageCircle, DollarSign,
  Target, Sparkles, Rocket, Clock, LogOut, Menu, Moon, RefreshCw, User, ListTodo,
} from "lucide-react";

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const sections = [
  { label: "Principal", items: [
    { to: "/dashboard", label: "Visão Geral", icon: Home },
    { to: "/tarefas", label: "Tarefas", icon: CheckSquare },
    { to: "/calendario", label: "Calendário", icon: Calendar },
  ]},
  { label: "Pessoal", items: [
    { to: "/ciclo", label: "Ciclo", icon: Moon },
  ]},
  { label: "Negócio", items: [
    { to: "/crm", label: "CRM", icon: Users },
    { to: "/follow-up", label: "Follow Up", icon: RefreshCw },
    { to: "/funis", label: "Funis de Vendas", icon: Workflow },
    { to: "/social-selling", label: "Abordagens", icon: MessageCircle },
    { to: "/faturamento", label: "Faturamento", icon: DollarSign },
  ]},
  { label: "Criação", items: [
    { to: "/objetivos", label: "Objetivos", icon: Target },
    { to: "/conteudo", label: "Conteúdo", icon: Sparkles },
    { to: "/acoes", label: "Ações", icon: Rocket },
  ]},
  { label: "Produtividade", items: [
    { to: "/tempo", label: "Registro de Tempo", icon: Clock },
  ]},
] as const;

const mobileItems = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { to: "/crm", label: "CRM", icon: Users },
  { to: "/social-selling", label: "Abord.", icon: MessageCircle },
  { to: "/faturamento", label: "Fatur.", icon: DollarSign },
] as const;

export function AppShell({ children, uid }: { children: React.ReactNode; uid: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const qc = useQueryClient();
  const [openMobile, setOpenMobile] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-header", uid],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name").eq("id", uid).maybeSingle();
      return data;
    },
  });
  const name = profile?.display_name?.trim() || "Painel";
  const initial = (name[0] ?? "P").toUpperCase();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  const NavLinks = () => (
    <>
      {sections.map((sec) => (
        <div key={sec.label} className="mb-5">
          <div className="px-4 mb-2 text-[0.65rem] uppercase tracking-widest font-mono text-bg-tertiary/60">{sec.label}</div>
          <div className="space-y-0.5">
            {sec.items.map((it) => {
              const active = path === it.to;
              const Icon = it.icon;
              return (
                <Link key={it.to} to={it.to} onClick={() => setOpenMobile(false)}
                  className={`flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm transition ${active ? "bg-terracota text-bg-primary" : "text-bg-tertiary hover:bg-white/5"}`}>
                  <Icon size={16} />
                  <span>{it.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );

  const UserBadge = () => (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10">
      <div className="w-8 h-8 rounded-full bg-terracota flex items-center justify-center text-bg-primary font-mono text-sm">{initial}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{name}</div>
        <Link to="/perfil" className="text-[10px] font-mono text-bg-tertiary/60 hover:text-bg-primary">Editar perfil</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-bg-primary">
      <aside className="hidden md:flex flex-col w-56 bg-dark text-bg-primary fixed inset-y-0 left-0">
        <div className="px-5 py-6">
          <div className="font-display text-2xl">Volta Pro Eixo<span className="text-terracota">.</span></div>
          <div className="label-mono text-bg-tertiary/60">Um espaço para empreendedoras</div>
        </div>
        <nav className="flex-1 overflow-y-auto pb-2"><NavLinks /></nav>
        <UserBadge />
        <button onClick={signOut}
          className="m-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono text-bg-tertiary/70 hover:bg-white/5">
          <LogOut size={14} /> Sair
        </button>
      </aside>

      <header className="md:hidden fixed top-0 inset-x-0 h-14 bg-dark text-bg-primary flex items-center justify-between px-4 z-40">
        <div className="font-display text-xl">Volta Pro Eixo<span className="text-terracota">.</span></div>
        <button onClick={() => setOpenMobile(true)}><Menu size={22} /></button>
      </header>

      {openMobile && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setOpenMobile(false)}>
          <aside className="w-64 h-full bg-dark text-bg-primary py-6 overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1"><NavLinks /></div>
            <UserBadge />
            <button onClick={signOut}
              className="m-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono text-bg-tertiary/70 hover:bg-white/5">
              <LogOut size={14} /> Sair
            </button>
          </aside>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-dark text-bg-primary flex justify-around items-center z-40 border-t border-white/10">
        {mobileItems.map((it) => {
          const active = path === it.to;
          const Icon = it.icon;
          return (
            <Link key={it.to} to={it.to} className={`flex flex-col items-center gap-0.5 text-[10px] font-mono ${active ? "text-terracota" : "text-bg-tertiary/70"}`}>
              <Icon size={18} />
              {it.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 md:ml-56 pt-14 md:pt-0 pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}

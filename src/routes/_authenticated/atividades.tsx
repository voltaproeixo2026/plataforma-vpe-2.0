import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useContext } from "react";
import { AuthUserContext } from "@/hooks/use-auth";

import { PageHeader } from "@/components/ui-custom";
import { ensureSeedETickle } from "@/lib/atividades";
import { CicloManager } from "@/components/atividades/CicloManager";
import { IntencoesCrud } from "@/components/atividades/Intencoes";
import { ProjetosLista } from "@/components/atividades/ProjetosLista";
import { ProjetoDetail } from "@/components/atividades/ProjetoDetail";
import { TiposCrud } from "@/components/atividades/Tipos";
import { RegistroTempoLista } from "@/components/atividades/RegistroTempoLista";

type Tab = "ciclo" | "intencoes" | "projetos" | "tipos" | "tempo";
const TABS: { key: Tab; label: string }[] = [
  { key: "ciclo", label: "Gerenciar ciclo" },
  { key: "intencoes", label: "Intenções" },
  { key: "projetos", label: "Projetos" },
  { key: "tipos", label: "Tipos" },
  { key: "tempo", label: "Registro de Tempo" },
];

export const Route = createFileRoute("/_authenticated/atividades")({
  component: AtividadesPage,
});

function AtividadesPage() {
  const user = useContext(AuthUserContext);
  if (!user) return null;
  const userId = user.id;

  const [tab, setTab] = useState<Tab>("projetos");
  const [projetoOpen, setProjetoOpen] = useState<string | null>(null);

  useEffect(() => {
    ensureSeedETickle(userId).catch(() => { /* silent */ });
  }, [userId]);

  return (
    <div>
      <PageHeader title="Atividades" subtitle="Ciclos, projetos e execução" />

      {!projetoOpen && (
        <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-2">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-mono transition ${tab === t.key ? "bg-terracota text-bg-primary" : "text-text-secondary hover:text-text-primary"}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {projetoOpen ? (
        <ProjetoDetail projetoId={projetoOpen} userId={userId} onBack={() => setProjetoOpen(null)} />
      ) : tab === "ciclo" ? <CicloManager userId={userId} />
        : tab === "intencoes" ? <IntencoesCrud userId={userId} />
        : tab === "projetos" ? <ProjetosLista userId={userId} onOpen={setProjetoOpen} />
        : tab === "tipos" ? <TiposCrud userId={userId} />
        : <RegistroTempoLista userId={userId} />}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useContext } from "react";
import { AuthUserContext } from "@/hooks/use-auth";

import { PageHeader } from "@/components/ui-custom";
import { ensureSeedETickle } from "@/lib/atividades";
import { CicloManager } from "@/components/atividades/CicloManager";
import { AtividadesLista } from "@/components/atividades/AtividadesLista";
import { IntencoesCrud } from "@/components/atividades/Intencoes";
import { ProjetosLista } from "@/components/atividades/ProjetosLista";
import { ProjetoDetail } from "@/components/atividades/ProjetoDetail";
import { TiposCrud } from "@/components/atividades/Tipos";

type Tab = "ciclo" | "atividades" | "intencoes" | "projetos" | "tipos";
const TABS: { key: Tab; label: string }[] = [
  { key: "ciclo", label: "Gerenciar ciclo" },
  { key: "atividades", label: "Atividades" },
  { key: "intencoes", label: "Intenções" },
  { key: "projetos", label: "Projetos" },
  { key: "tipos", label: "Tipos" },
];

export const Route = createFileRoute("/_authenticated/atividades")({
  component: AtividadesPage,
});

function AtividadesPage() {
  const user = useAuthUser();
  const userId = user.id;
  const [tab, setTab] = useState<Tab>("projetos");
  const [projetoOpen, setProjetoOpen] = useState<string | null>(null);

  useEffect(() => {
    ensureSeedETickle(userId).catch(() => { /* silent */ });
  }, [userId]);

  const openProjeto = (id: string) => { setProjetoOpen(id); setTab("projetos"); };

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
        : tab === "atividades" ? <AtividadesLista userId={userId} onOpenProjeto={openProjeto} />
        : tab === "intencoes" ? <IntencoesCrud userId={userId} />
        : tab === "projetos" ? <ProjetosLista userId={userId} onOpen={openProjeto} />
        : <TiposCrud userId={userId} />}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/ui-custom";
import { CicloManager } from "@/components/atividades/CicloManager";

export const Route = createFileRoute("/_authenticated/atividades/semanas")({
  component: SemanasPage,
});

function SemanasPage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div>
      <PageHeader title="Gerenciar ciclo" subtitle="Semanas do ciclo atual, geração da próxima e histórico" />
      <CicloManager userId={user.id} />
    </div>
  );
}

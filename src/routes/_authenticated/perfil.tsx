import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, Btn, Field, inputCls } from "@/components/ui-custom";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Perfil — Painel" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useQuery({
    queryKey: ["profile-edit", uid],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name").eq("id", uid).maybeSingle();
      setName(data?.display_name ?? "");
      return data;
    },
  });

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", uid);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Perfil atualizado"); qc.invalidateQueries(); }
  };

  return (
    <div className="max-w-md">
      <PageHeader title="Perfil" subtitle={user?.email ?? ""} />
      <div className="bg-bg-primary border border-border rounded-xl p-5">
        <Field label="Nome de exibição">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Btn onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Btn>
      </div>
    </div>
  );
}

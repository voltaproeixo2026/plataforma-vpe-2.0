import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nova senha — Painel" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) { toast.error("Senha muito curta"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Senha atualizada"); nav({ to: "/dashboard" }); }
  };

  return (
    <div className="min-h-screen bg-dark text-bg-primary flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-4xl">Nova senha</div>
        </div>
        {!ready && <div className="text-sm text-bg-tertiary/70 mb-4">Abra o link do email para continuar.</div>}
        <label className="label-mono text-bg-tertiary/70">Nova senha</label>
        <input type="password" minLength={6} required value={pwd} onChange={(e) => setPwd(e.target.value)}
          className="w-full mt-1 mb-4 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-bg-primary focus:outline-none focus:border-terracota" />
        <button disabled={busy || !ready} type="submit"
          className="w-full py-3 rounded-lg bg-terracota hover:bg-terracota-light text-bg-primary font-mono transition disabled:opacity-60">
          {busy ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </div>
  );
}

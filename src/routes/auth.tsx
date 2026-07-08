import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Painel" }] }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && user) nav({ to: "/dashboard" }); }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
        if (error) throw error;
        nav({ to: "/dashboard" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password: pwd,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        setMsg("Conta criada. Se a confirmação por email estiver ativa, verifique sua caixa de entrada.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMsg("Enviamos um link de recuperação para seu email.");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Erro");
    } finally { setBusy(false); }
  };

  const title = mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha";

  return (
    <div className="min-h-screen bg-dark text-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-5xl">Volta Pro Eixo<span className="text-terracota">.</span></div>
          <div className="label-mono mt-2 text-bg-tertiary/70">Um espaço para empreendedoras</div>
        </div>

        <h1 className="font-display text-2xl mb-4">{title}</h1>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="label-mono text-bg-tertiary/70">Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como quer ser chamado"
                className="w-full mt-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-bg-primary focus:outline-none focus:border-terracota" />
            </div>
          )}
          <div>
            <label className="label-mono text-bg-tertiary/70">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-bg-primary focus:outline-none focus:border-terracota" />
          </div>
          {mode !== "forgot" && (
            <div>
              <label className="label-mono text-bg-tertiary/70">Senha</label>
              <div className="relative">
                <input type={show ? "text" : "password"} required minLength={6} value={pwd} onChange={(e) => setPwd(e.target.value)}
                  className="w-full mt-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-bg-primary focus:outline-none focus:border-terracota pr-10" />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-bg-tertiary/60">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}
          {err && <div className="text-sm text-[#ff8a8a]">{err}</div>}
          {msg && <div className="text-sm text-sage-light">{msg}</div>}
          <button disabled={busy} type="submit"
            className="w-full py-3 rounded-lg bg-terracota hover:bg-terracota-light text-bg-primary font-mono transition disabled:opacity-60">
            {busy ? "Aguarde..." : title}
          </button>
        </form>

        {false && (
          <div className="mt-4 text-center text-xs font-mono text-bg-tertiary/60">
            Não tem conta?{" "}
            <button onClick={() => setMode("signup")} className="text-terracota">Criar agora</button>
          </div>
        )}
        <div className="mt-6 text-center">
          <Link to="/dashboard" className="text-[11px] font-mono text-bg-tertiary/50 hover:text-bg-tertiary">← início</Link>
        </div>
      </div>
    </div>
  );
}

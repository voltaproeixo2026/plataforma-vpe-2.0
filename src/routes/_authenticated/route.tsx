import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user, loading } = useAuth();
  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-tertiary font-mono text-sm">Carregando...</div>;
  }
  return <AppShell uid={user.id}><Outlet /></AppShell>;
}

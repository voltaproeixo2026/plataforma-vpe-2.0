import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/Layout";
import { AuthUserContext, useAuth } from "@/hooks/use-auth";

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
  const routeContext = Route.useRouteContext();
  const { user, loading } = useAuth();
  const authedUser = user ?? routeContext.user;
  if (loading || !authedUser) {
    return <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-tertiary font-mono text-sm">Carregando...</div>;
  }
  return (
    <AuthUserContext.Provider value={authedUser}>
      <AppShell uid={authedUser.id}><Outlet /></AppShell>
    </AuthUserContext.Provider>
  );
}

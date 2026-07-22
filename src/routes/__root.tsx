import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <div className="text-center max-w-md">
        <h1 className="font-display text-6xl text-terracota">404</h1>
        <p className="mt-3 text-text-secondary">Página não encontrada.</p>
        <a href="/" className="mt-6 inline-block px-5 py-2.5 rounded-lg bg-terracota text-bg-primary font-mono text-sm">Voltar</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "root" }); }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <div className="text-center max-w-md">
        <h1 className="font-display text-2xl">Algo deu errado</h1>
        <p className="mt-2 text-sm text-text-secondary">Tente novamente ou volte para o início.</p>
        <div className="mt-6 flex gap-2 justify-center">
          <button onClick={() => { router.invalidate(); reset(); }} className="px-4 py-2 rounded-lg bg-terracota text-bg-primary font-mono text-sm">Tentar de novo</button>
          <a href="/" className="px-4 py-2 rounded-lg border border-border font-mono text-sm">Início</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sistema Volta Pro Eixo" },
      { name: "description", content: "Um espaço para empreendedoras que pensam demais e fazem de menos.\n\nUm lugar só seu pra organizar o que sua cabeça já sabe." },
      { property: "og:title", content: "Sistema Volta Pro Eixo" },
      { property: "og:description", content: "Um espaço para empreendedoras que pensam demais e fazem de menos.\n\nUm lugar só seu pra organizar o que sua cabeça já sabe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },

      { name: "twitter:title", content: "Sistema Volta Pro Eixo" },
      { name: "twitter:description", content: "Um espaço para empreendedoras que pensam demais e fazem de menos.\n\nUm lugar só seu pra organizar o que sua cabeça já sabe." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3d3b3b79-5a5c-4a39-8f18-d358b09d3940/id-preview-f5f3e59e--a0a2a697-5587-4121-8618-ff777a1943b3.lovable.app-1784679290000.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3d3b3b79-5a5c-4a39-8f18-d358b09d3940/id-preview-f5f3e59e--a0a2a697-5587-4121-8618-ff777a1943b3.lovable.app-1784679290000.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function AuthSync() {
  const router = useRouter();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      <Outlet />
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}

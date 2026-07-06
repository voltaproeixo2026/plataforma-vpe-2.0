import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Painel — Gestão de Negócio" }] }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="font-display text-2xl">Painel<span className="text-terracota">.</span></div>
        <Link to="/auth" className="px-4 py-2 rounded-lg bg-terracota text-bg-primary font-mono text-sm">Entrar</Link>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="font-display text-5xl md:text-6xl leading-tight">
          Seu negócio inteiro, <span className="text-terracota">em um só lugar.</span>
        </h1>
        <p className="text-lg text-text-secondary mt-6 max-w-2xl mx-auto">
          CRM, tarefas, faturamento, conteúdo, funis e produtividade — sem planilhas soltas.
          Cadastre-se e comece do zero, com seus dados só seus.
        </p>
        <div className="mt-10 flex gap-3 justify-center">
          <Link to="/auth" className="px-6 py-3 rounded-lg bg-terracota hover:bg-terracota-light text-bg-primary font-mono">Criar conta grátis</Link>
          <Link to="/auth" className="px-6 py-3 rounded-lg border border-border font-mono">Entrar</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-20 text-left">
          {[
            { emoji: "👥", title: "CRM & Funis", desc: "Organize contatos, follow-ups e etapas do funil." },
            { emoji: "💰", title: "Faturamento", desc: "Registre entradas, meta do mês e progresso." },
            { emoji: "✨", title: "Conteúdo", desc: "Planeje ideias, calendário e status por funil." },
          ].map(f => (
            <div key={f.title} className="bg-bg-secondary border border-border rounded-2xl p-6">
              <div className="text-3xl">{f.emoji}</div>
              <div className="font-display text-xl mt-3">{f.title}</div>
              <div className="text-sm text-text-secondary mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>
      <footer className="border-t border-border py-8 text-center text-xs font-mono text-text-tertiary">
        © {new Date().getFullYear()} Painel · Gestão de negócio
      </footer>
    </div>
  );
}

# Novo SaaS multiusuário baseado no Dashboard Profissional v.1

Este projeto já está conectado a um Supabase próprio (`fthkcnscofdjpjtjwhbg`), separado do projeto de referência. Vou portar layout, componentes e módulos preservando o visual (paleta terracota/sage/gold, Playfair + DM Sans/Mono), removendo todo conteúdo fixo ("Bia", saudações personalizadas, dados de exemplo) e reescrevendo a camada de dados para ser 100% multiusuário.

## Banco de dados (migração única)

Recriar no Supabase do novo projeto todas as tabelas do referência, cada uma com `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, RLS habilitada e política única `FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`:

- `profiles` (id = auth.users.id, `display_name`, `last_cycle_start`, `cycle_length`) — política escopada por `id = auth.uid()`
- `contacts`, `objectives`, `intentions`, `ss_counts`, `ss_config`, `fat_entries`, `fat_meta`, `content_cards`, `actions`, `calendar_events`, `tasks`, `funnels`, `time_logs`, `sheets_config`

Trigger `on_auth_user_created` em `auth.users` chama `public.handle_new_user()` (SECURITY DEFINER, `search_path = public`) que insere em `profiles` usando `raw_user_meta_data->>'display_name'` (ou email como fallback). Nenhum dado semente.

GRANTs padrão `authenticated` + `service_role` em cada tabela (nunca `anon`).

## Autenticação

- Rota pública `/auth` com abas Entrar / Criar conta / Esqueci minha senha (Supabase Auth: `signInWithPassword`, `signUp` com `emailRedirectTo`, `resetPasswordForEmail` redirecionando para `/reset-password`).
- Rota pública `/reset-password` que detecta `type=recovery` e chama `updateUser({ password })`.
- Layout protegido em `src/routes/_authenticated/route.tsx` (gate gerenciado, `ssr: false`, redireciona para `/auth`).
- `useAuth` hook lê sessão via `supabase.auth.onAuthStateChange` + `getSession`.

## Estrutura de rotas (dentro de `_authenticated/`)

Espelhar o referência renomeando `_app.*` → `_authenticated.*`:

`index` (visão geral), `tarefas`, `calendario`, `ciclo`, `crm`, `funis`, `social-selling`, `faturamento`, `objetivos`, `conteudo`, `acoes`, `tempo`, `arsenal`, `follow-up`.

Cada tela mantém layout/componentes do referência, mas:
- Todas as queries filtram por `user_id = auth.uid()` (via RLS + `.eq('user_id', uid)` quando necessário).
- Todos os inserts incluem `user_id: uid`.
- Sem dados pré-preenchidos: dashboard vazio para conta nova, com empty states.

## Componentes e utilitários

Portar de `src/components/`: `Layout.tsx` (AppShell/sidebar/mobile nav — sem "Bia"), `ui-custom.tsx`, `CycleWelcomeCard.tsx`, `PhaseCards.tsx`.

Portar `src/utils/cyclePhase.ts` e `src/utils/moonPhase.ts`.

Portar `src/lib/biz.ts` removendo a saudação "Bom dia, Bia" — substituir por saudação genérica baseada no `display_name` do profile (ou "Olá" quando vazio).

## Remoção de conteúdo fixo

- Título da app: "Dashboard" genérico (configurável via `display_name` no header).
- Sidebar mostra iniciais/nome do usuário logado, não "Bia."
- Nenhum título, subtítulo, saudação, meta, exemplo ou placeholder cita nome próprio.
- Metadata `<head>` do root: título neutro tipo "Painel — Gestão de Negócio".

## Design system

Manter `src/styles.css` do referência (paleta creme/terracota/sage/gold + fontes Playfair Display / DM Sans / DM Mono via `<link>` no `__root.tsx`).

## Detalhes técnicos

- Copiar os assets/código com `cross_project--copy_project_asset` onde possível (imagens não existem; código será reescrito).
- `src/routes/_authenticated/route.tsx` é gerenciado pela integração — não editar.
- Reads/writes vão pelo cliente browser Supabase (`@/integrations/supabase/client`) com RLS respeitando `auth.uid()`; não usar `supabaseAdmin`.
- `sitemap.xml` + `robots.txt` para as rotas públicas (`/`, `/auth`, `/reset-password`).
- `og:image` omitido para permitir screenshot automático.

## Ordem de execução

1. Rodar migração única (schema + trigger + RLS).
2. Após aprovação da migração e regeneração dos types, criar em paralelo: styles, root, hooks de auth, componentes UI, utilitários, rotas de auth, layout protegido, todas as rotas de módulo.
3. Sitemap/robots.
4. Verificar build.

## Fora do escopo

- Assinaturas/pagamentos, planos, billing.
- Onboarding guiado, tour, seed de exemplo.
- Login social (Google/Apple) — apenas email/senha nesta versão.
- Multi-tenant além de "cada user vê só o próprio" (sem times/organizações).

Se quiser adicionar login social ou onboarding depois, é uma iteração separada.

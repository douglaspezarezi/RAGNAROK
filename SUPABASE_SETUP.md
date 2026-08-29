# Supabase — passos manuais

O código de auth + persistência já está no repo. Falta você conectar um projeto
Supabase real. ~10 minutos.

## 1. Criar o projeto

1. Em <https://supabase.com/dashboard>, **New project**.
2. Anote a **senha do banco** (não é usada pelo app, mas pela CLI/psql).

## 2. Rodar a migration (cria tabelas + RLS + trigger)

Arquivo: [`supabase/migrations/20260829120000_init_game_schema.sql`](supabase/migrations/20260829120000_init_game_schema.sql)

**Opção A — SQL Editor (mais rápido):**
Dashboard → **SQL Editor** → **New query** → cole o conteúdo do arquivo → **Run**.

**Opção B — Supabase CLI:**
```bash
npm i -g supabase          # se ainda não tiver
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

O que a migration cria:
- Tabelas `players`, `characters`, `player_companions`, `player_seals`, `offline_sessions`.
- **RLS ligado** em todas — cada usuário só lê/escreve as próprias linhas
  (`auth.uid() = players.auth_user_id`, com os joins correspondentes).
- Trigger `on_auth_user_created`: cria a linha em `players` no signup.
  (O `character` inicial é criado pelo app, reaproveitando a lógica de
  `lib/gameSave.ts`.)

> Colunas adicionadas além da lista da tarefa, para não perder estado:
> `characters.progress` (jsonb: `clearedChapters`, `clearedStageIds`,
> `rebirthCount`, `equippedSeals`) e `fragments` em `player_seals` /
> `player_companions`.

## 3. Configurar Auth

Dashboard → **Authentication → Providers → Email**: já vem ligado.

- **Para testar rápido:** Authentication → **Providers → Email** → desligue
  *"Confirm email"* (assim o cadastro já entra direto).
- **Mantendo a confirmação ligada:** o app mostra "confira seu e-mail" após o
  cadastro; em **Authentication → URL Configuration** ponha
  `http://localhost:3000` (ou a porta que você usa) em *Site URL* e
  *Redirect URLs*.
- **Login social (depois):** Authentication → Providers → habilite Google/etc. e
  troque o botão desabilitado em `AuthScreen.tsx` por
  `supabase.auth.signInWithOAuth({ provider: "google" })`.

## 4. Variáveis de ambiente

Dashboard → **Project Settings → API**. Copie **Project URL** e a chave
**anon / public**.

```bash
cp apps/web/.env.example apps/web/.env.local
# edite apps/web/.env.local:
#   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Reinicie o dev server (`npm run dev --workspace @game/web`). Sem essas
variáveis, o app abre numa tela explicando o que falta em vez de quebrar.

## 5. Testar o fluxo

1. Abra o app → tela de login → **Cadastre-se** com um e-mail/senha.
2. Primeiro acesso: cria `players` (trigger) + `characters` inicial (app).
3. Jogue alguns segundos → o progresso salva sozinho a cada ~10s e ao subir de
   nível / avançar estágio.
4. Recarregue a aba → o personagem volta de onde parou.
5. Deixe a aba em segundo plano > 60s e volte → aparece o modal
   **"Enquanto você esteve fora…"** com XP/ouro/fragmentos, e uma linha nova em
   `offline_sessions` (dá pra conferir no Table Editor).

## Como auditar depois

- `offline_sessions.rewards_summary` guarda o `OfflineRewardsSummary` completo
  de `@game/core` (segundos pedidos/creditados, teto, kills estimados, etc.).
- `characters.updated_at` / `players.last_seen_at` mostram o último save.

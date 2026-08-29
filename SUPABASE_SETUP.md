# Supabase — passos manuais

O código de auth + persistência já está no repo. Falta você conectar um projeto
Supabase real. ~10 minutos.

## 1. Criar o projeto

1. Em <https://supabase.com/dashboard>, **New project**.
2. Anote a **senha do banco** (não é usada pelo app, mas pela CLI/psql).

## 2. Rodar as migrations (cria tabelas + RLS + trigger + colunas do gacha)

**Rode as duas, em ordem:**
1. [`supabase/migrations/20260829120000_init_game_schema.sql`](supabase/migrations/20260829120000_init_game_schema.sql) — tabelas + RLS + trigger.
2. [`supabase/migrations/20260829130000_gacha_equipment_rebirth.sql`](supabase/migrations/20260829130000_gacha_equipment_rebirth.sql) — 3 colunas novas em `characters`: `equipped_seals`, `summon_crystals`, `summon_pity`.

**Opção A — SQL Editor (mais rápido):**
Dashboard → **SQL Editor** → **New query** → cole o conteúdo de cada arquivo → **Run** (uma vez cada).

**Opção B — Supabase CLI:**
```bash
npm i -g supabase          # se ainda não tiver
supabase link --project-ref SEU_PROJECT_REF
supabase db push           # aplica as duas
```

O que fica no banco:
- Tabelas `players`, `characters`, `player_companions`, `player_seals`, `offline_sessions`.
- **RLS ligado** em todas — cada usuário só lê/escreve as próprias linhas
  (`auth.uid() = players.auth_user_id`, com os joins correspondentes).
- Trigger `on_auth_user_created`: cria a linha em `players` no signup.
  (O `character` inicial é criado pelo app, reaproveitando `lib/gameSave.ts`.)
- Em `characters`: `progress` jsonb (`clearedChapters`/`clearedStageIds`/`rebirthCount`),
  `equipped_seals` jsonb (slot → id do Selo), `summon_crystals` (moeda do gacha,
  começa em 1000) e `summon_pity` jsonb (`{"companion": 0, "seal": 0}`).
  `player_seals`/`player_companions` têm `fragments`.

> **Se você já tinha rodado a migration 1** antes desta tarefa: rode só a
> migration 2. O app carrega mesmo sem as colunas novas (usa defaults), mas
> **salvar** só funciona depois que a coluna existir.

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
6. **Invocar** (topo → *Invocar*): você começa com 1000 💎. Invoque 1x/10x nos
   dois banners. O pity sobe a cada roll sem Tier S; duplicata vira fragmentos.
   Confira `characters.summon_crystals` / `summon_pity` e linhas em
   `player_companions` / `player_seals`.
7. **Equipar** (topo → *Equipar*): os Selos que você tem (via `player_seals`)
   aparecem por categoria; equipe um e volte pra *Combate* — o painel de Status
   já reflete o efeito. Confira `characters.equipped_seals`.
8. **Renascer**: só aparece no topo da tela de Combate quando `canRebirth` é
   `true` (nível ≥ 100 **ou** capítulo ≥ 8 concluído). O modal mostra o que
   perde/mantém e o multiplicador antes/depois.

## Como auditar depois

- `offline_sessions.rewards_summary` guarda o `OfflineRewardsSummary` completo
  de `@game/core` (segundos pedidos/creditados, teto, kills estimados, etc.).
- `characters.updated_at` / `players.last_seen_at` mostram o último save.

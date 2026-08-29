# Supabase — passos manuais

O código de auth + persistência já está no repo. Falta você conectar um projeto
Supabase real. ~10 minutos.

## 1. Criar o projeto

1. Em <https://supabase.com/dashboard>, **New project**.
2. Anote a **senha do banco** (não é usada pelo app, mas pela CLI/psql).

## 2. Rodar as migrations (cria tabelas + RLS + trigger + colunas do gacha)

**Rode as quatro, em ordem:**
1. [`supabase/migrations/20260829120000_init_game_schema.sql`](supabase/migrations/20260829120000_init_game_schema.sql) — tabelas + RLS + trigger.
2. [`supabase/migrations/20260829130000_gacha_equipment_rebirth.sql`](supabase/migrations/20260829130000_gacha_equipment_rebirth.sql) — 3 colunas novas em `characters`: `equipped_seals`, `summon_crystals`, `summon_pity`.
3. [`supabase/migrations/20260829140000_events_and_rankings.sql`](supabase/migrations/20260829140000_events_and_rankings.sql) — Eventos Temporários + Rankings (`events`, `player_event_progress`, `leaderboard_stage`, `weekly_boss`, `weekly_boss_attempts`) + RLS. O fim do arquivo tem um bloco de **seed de teste** comentado.
4. [`supabase/migrations/20260829150000_qol_tutorial_settings_achievements.sql`](supabase/migrations/20260829150000_qol_tutorial_settings_achievements.sql) — QoL: `players.tutorial_completed` + `players.settings`, `characters.created_at`, `achievements` (com **20 conquistas já semeadas**) + `player_achievements` + RLS.

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

## 6. Eventos e Rankings (GDD 8.5)

Três telas novas no topo: **Eventos**, **Ranking**, **Chefe da Semana**. Tudo
assíncrono — nenhuma exige outro jogador online.

### Ranking de Estágio — não precisa de setup

`leaderboard_stage` se popula sozinho: cada vez que o personagem salva (autosave
de ~10s, subir de nível, avançar estágio), o app grava/atualiza a linha do
jogador. Abra **Combate** com uma conta e depois **Ranking**. `progress_index` é
a posição do estágio atual numa ordem canônica (capítulo → nível → comum antes
de chefe); maior = mais avançado. Quem não está no top 100 vê "Sua posição: #X"
abaixo da lista.

> Rival fake: `insert into leaderboard_stage (player_id, character_name, job_id,
> progress_index, level) values ('<player_id real>', 'Sentinela', 'sentinela',
> 25, 60) on conflict (player_id) do update set progress_index = 25, level = 60;`
> (o `player_id` precisa existir em `public.players`).

### Definir um EVENTO de teste

SQL Editor → cole (ajuste datas/ids conforme quiser):

```sql
-- Caso A: reaproveita um capítulo do bestiário, monstros 1.5x de nível
insert into public.events
  (name, description, stage_override, starts_at, ends_at,
   exclusive_reward_type, exclusive_reward_id, completion_goal)
values
  ('Festival da Copa Sussurrante',
   'Estágio sazonal nas Florestas de Sylmere com monstros reforçados.',
   '{"chapterNumber": 3, "levelMultiplier": 1.5}'::jsonb,
   now() - interval '1 hour', now() + interval '3 days',
   'companion', 'coruja-sabia', 50);
```

```sql
-- Caso B: conjunto PRÓPRIO de monstros (cada um usa um id do bestiário de molde)
insert into public.events
  (name, description, stage_override, starts_at, ends_at,
   exclusive_reward_type, exclusive_reward_id, completion_goal)
values
  ('Incursão Relâmpago',
   'Alvos especiais em série. Recompensa: um Selo exclusivo.',
   '{"levelMultiplier": 2, "monsters": [
      {"baseId": "gotinha", "name": "Gotinha Relâmpago", "level": 30},
      {"baseId": "coelhal", "name": "Coelhal Relâmpago", "level": 35},
      {"baseId": "broteiro", "name": "Broteiro Relâmpago", "level": 40}
    ]}'::jsonb,
   now() - interval '1 hour', now() + interval '2 days',
   'seal', 'selo-do-coelhal', 40);
```

Campos:
- `stage_override` — `{"chapterNumber": N}` **ou** `{"monsters": [...]}`;
  `levelMultiplier` (opcional) escala o nível efetivo (afeta HP/ATQ).
- `exclusive_reward_type` — `'companion'` ou `'seal'`; `exclusive_reward_id` é um
  id de `packages/game-data/src/companions.ts` / `battleSeals.ts`.
- `completion_goal` — critério: "derrote N monstros do evento".
- Para desativar: `update events set is_active = false where id = '...';` ou
  deixe `ends_at` no passado.

Na tela **Eventos**: aparece nome, descrição, recompensa, contador regressivo e
barra `kills / meta`. **Participar** roda o combate (mesmas regras da campanha) e
grava o progresso a cada 5 kills e ao sair. Ao bater a meta, o botão **Resgatar
recompensa exclusiva** entrega o Companheiro/Selo (aparece em Equipar/Invocar) e
marca `reward_claimed`.

### Definir o CHEFE DA SEMANA de teste

```sql
insert into public.weekly_boss
  (monster_id, week_start, week_end, boosted_stats_multiplier)
values
  ('reflexo-sombrio', now() - interval '1 hour', now() + interval '7 days', 4);
```

- `monster_id` — um MVP de `bestiary.ts` (ex.: `reflexo-sombrio`,
  `general-esquecido`, `rei-do-areal-eterno`, `capitao-amaldicoado`,
  `serpente-das-profundezas`).
- `boosted_stats_multiplier` — reforço de HP/ATQ/DEF (aplicado elevando o nível
  efetivo do monstro; não toca `@game/core`).
- Para trocar de chefe: `update weekly_boss set is_active = false where id='...';`
  e insira outro.

Na tela **Chefe da Semana**: mostra o chefe, HP/ATQ reforçados e contador. **Tentar
agora** simula 60s de combate (via `simulateCombatTick`), registra o dano em
`weekly_boss_attempts` e atualiza o ranking (maior dano por jogador). Limite:
**3 tentativas por dia** (contadas no cliente a partir de `attempted_at`).

## 7. Onboarding, Configurações e Conquistas (migration 4)

Nada de setup extra — a migration 4 já semeia as **20 conquistas** e cria as
colunas de tutorial/preferências.

- **Tutorial**: aparece automático no **primeiro login** de uma conta nova
  (`players.tutorial_completed = false`). "Pular tutorial" ou terminar marca a
  coluna e não volta. **Config → Rever tutorial** reabre quando quiser.
- **Config** (`/settings`): toggles de Som/Música (persistem em
  `players.settings`, sem áudio ainda), **Velocidade de combate** Normal/Rápido
  (muda o intervalo do loop na tela de Combate — 1000ms / 500ms), dados da conta
  (e-mail, data de criação do personagem) e **Sair da conta**.
- **Conquistas** (`/achievements`): lista as 20; desbloqueadas com destaque
  âmbar, bloqueadas em cinza com barra "X/Y" quando o critério é numérico (ex.:
  "42/100 monstros derrotados").
  São verificadas nos pontos que já existem (derrota de monstro, level up,
  invocação, rebirth, equipar Selo, vitória no Chefe da Semana, recompensa de
  evento) — sem polling. Ao desbloquear: notificação in-game + entrega da
  recompensa (Companheiro/Selo) quando houver.
- **Notificações**: `useNotifications()` / `toast.*` — fila de toasts no canto
  (conquista, erro ao salvar, evento terminando, invocação Tier S).

Para testar conquistas rápido: derrote ~10 monstros ("Caçador Iniciante"),
equipe um Selo, ou rode uma tentativa vencedora no Chefe da Semana.

## Como auditar depois

- `offline_sessions.rewards_summary` guarda o `OfflineRewardsSummary` completo
  de `@game/core` (segundos pedidos/creditados, teto, kills estimados, etc.).
- `characters.updated_at` / `players.last_seen_at` mostram o último save.

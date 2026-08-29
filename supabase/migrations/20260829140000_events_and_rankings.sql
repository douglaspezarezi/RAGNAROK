-- RAGNAROK — Eventos Temporários + Rankings (GDD 8.5)
--
-- Tudo assíncrono: nenhuma feature exige dois jogadores online ao mesmo tempo.
-- Os rankings são "fotografias" — cada jogador escreve a própria linha nos
-- mesmos momentos em que já salva o personagem.
--
-- Rode depois das migrations 1 e 2 (SQL Editor ou `supabase db push`).

-- =========================================================================
-- TAREFA 1 — Eventos Temporários
-- =========================================================================

-- events : definidos manualmente (SQL Editor / service role). O cliente só lê.
--
-- stage_override (jsonb) é flexível para os dois casos pedidos:
--   a) reaproveitar um capítulo do bestiary.ts:
--        {"chapterNumber": 3, "levelMultiplier": 1.5}
--   b) conjunto próprio de monstros (cada um usa um monstro do bestiary como
--      "molde" + overrides):
--        {"levelMultiplier": 1, "monsters": [
--           {"baseId": "gotinha", "name": "Gotinha Sazonal", "level": 40},
--           {"baseId": "salgueira-ancestral", "isBoss": true, "bossRank": "Mini"}
--        ]}
--   levelMultiplier é opcional e escala o nível efetivo dos monstros do evento
--   (afeta HP/ATQ via deriveMonsterStats, sem tocar em @game/core).
create table if not exists public.events (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  description           text not null,
  stage_override        jsonb not null default '{}'::jsonb,
  starts_at             timestamptz not null,
  ends_at               timestamptz not null,
  -- recompensa exclusiva entregue ao completar o critério
  exclusive_reward_type text not null check (exclusive_reward_type in ('companion', 'seal')),
  exclusive_reward_id   text not null,
  -- critério simples e claro: "derrote N monstros do evento"
  completion_goal       integer not null default 100 check (completion_goal > 0),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);

create index if not exists events_window_idx
  on public.events (is_active, starts_at, ends_at);

-- player_event_progress : progresso do jogador num evento
--   progress_data: {"kills": <int>, "damage": <int>}
create table if not exists public.player_event_progress (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references public.players (id) on delete cascade,
  event_id       uuid not null references public.events (id) on delete cascade,
  progress_data  jsonb not null default '{}'::jsonb,
  reward_claimed boolean not null default false,
  updated_at     timestamptz not null default now(),
  unique (player_id, event_id)
);

-- =========================================================================
-- TAREFA 2 — Ranking de Estágio (progressão principal)
-- =========================================================================

-- leaderboard_stage : uma linha por jogador, sobrescrita a cada save.
--   progress_index = posição do estágio atual numa ordenação canônica
--   (capítulo -> nível -> comum antes de chefe). Maior = mais avançado.
--   character_name é desnormalizado (nome do job) para o ranking não precisar
--   ler a tabela characters de outros jogadores.
create table if not exists public.leaderboard_stage (
  player_id      uuid primary key references public.players (id) on delete cascade,
  character_name text not null,
  job_id         text not null,
  progress_index integer not null default 0,
  level          integer not null default 1,
  updated_at     timestamptz not null default now()
);

create index if not exists leaderboard_stage_rank_idx
  on public.leaderboard_stage (progress_index desc, level desc, updated_at asc);

-- =========================================================================
-- TAREFA 3 — Ranking de Chefe Semanal (Boss Rush)
-- =========================================================================

-- weekly_boss : definido manualmente entre os MVPs do bestiary.ts.
--   boosted_stats_multiplier eleva HP/ATQ/DEF do chefe (aplicado no app
--   elevando o nível efetivo do monstro — sem tocar em @game/core).
create table if not exists public.weekly_boss (
  id                      uuid primary key default gen_random_uuid(),
  monster_id              text not null,
  week_start              timestamptz not null,
  week_end                timestamptz not null,
  boosted_stats_multiplier numeric not null default 3 check (boosted_stats_multiplier >= 1),
  is_active               boolean not null default true,
  created_at              timestamptz not null default now()
);

create index if not exists weekly_boss_window_idx
  on public.weekly_boss (is_active, week_start, week_end);

-- weekly_boss_attempts : uma linha por tentativa. Ranking = maior dano por jogador.
--   character_name desnormalizado, mesmo motivo do leaderboard_stage.
create table if not exists public.weekly_boss_attempts (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references public.players (id) on delete cascade,
  weekly_boss_id uuid not null references public.weekly_boss (id) on delete cascade,
  character_name text not null,
  damage_dealt   bigint not null check (damage_dealt >= 0),
  attempted_at   timestamptz not null default now()
);

create index if not exists weekly_boss_attempts_rank_idx
  on public.weekly_boss_attempts (weekly_boss_id, damage_dealt desc);
create index if not exists weekly_boss_attempts_player_idx
  on public.weekly_boss_attempts (weekly_boss_id, player_id, attempted_at desc);

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table public.events                enable row level security;
alter table public.player_event_progress enable row level security;
alter table public.leaderboard_stage     enable row level security;
alter table public.weekly_boss           enable row level security;
alter table public.weekly_boss_attempts  enable row level security;

-- events: qualquer autenticado LÊ; ninguém escreve pelo cliente (só SQL/serviço).
create policy "events_select_all" on public.events
  for select to authenticated using (true);

-- player_event_progress: dono via player_id
create policy "player_event_progress_select_own" on public.player_event_progress
  for select using (exists (
    select 1 from public.players p
    where p.id = player_event_progress.player_id and p.auth_user_id = auth.uid()
  ));
create policy "player_event_progress_insert_own" on public.player_event_progress
  for insert with check (exists (
    select 1 from public.players p
    where p.id = player_event_progress.player_id and p.auth_user_id = auth.uid()
  ));
create policy "player_event_progress_update_own" on public.player_event_progress
  for update using (exists (
    select 1 from public.players p
    where p.id = player_event_progress.player_id and p.auth_user_id = auth.uid()
  )) with check (exists (
    select 1 from public.players p
    where p.id = player_event_progress.player_id and p.auth_user_id = auth.uid()
  ));

-- leaderboard_stage: TODOS os autenticados leem (é um ranking); cada um só
-- escreve/atualiza a própria linha.
create policy "leaderboard_stage_select_all" on public.leaderboard_stage
  for select to authenticated using (true);
create policy "leaderboard_stage_insert_own" on public.leaderboard_stage
  for insert with check (exists (
    select 1 from public.players p
    where p.id = leaderboard_stage.player_id and p.auth_user_id = auth.uid()
  ));
create policy "leaderboard_stage_update_own" on public.leaderboard_stage
  for update using (exists (
    select 1 from public.players p
    where p.id = leaderboard_stage.player_id and p.auth_user_id = auth.uid()
  )) with check (exists (
    select 1 from public.players p
    where p.id = leaderboard_stage.player_id and p.auth_user_id = auth.uid()
  ));

-- weekly_boss: qualquer autenticado LÊ; ninguém escreve pelo cliente.
create policy "weekly_boss_select_all" on public.weekly_boss
  for select to authenticated using (true);

-- weekly_boss_attempts: TODOS leem (ranking); cada um só insere as próprias
-- tentativas (sem update/delete — histórico imutável).
create policy "weekly_boss_attempts_select_all" on public.weekly_boss_attempts
  for select to authenticated using (true);
create policy "weekly_boss_attempts_insert_own" on public.weekly_boss_attempts
  for insert with check (exists (
    select 1 from public.players p
    where p.id = weekly_boss_attempts.player_id and p.auth_user_id = auth.uid()
  ));

-- =========================================================================
-- SEED DE TESTE (opcional) — descomente e rode no SQL Editor para validar as
-- três telas. Ajuste as datas se necessário.
-- =========================================================================
--
-- -- 1) Evento ativo agora, terminando em 3 dias, reaproveitando o Capítulo 3
-- --    com monstros 1.5x de nível, recompensa = Companheiro "Coruja Sábia" (Tier A).
-- insert into public.events
--   (name, description, stage_override, starts_at, ends_at,
--    exclusive_reward_type, exclusive_reward_id, completion_goal)
-- values
--   ('Festival da Copa Sussurrante',
--    'Estágio sazonal nas Florestas de Sylmere com monstros reforçados. Complete o desafio para levar um Companheiro exclusivo.',
--    '{"chapterNumber": 3, "levelMultiplier": 1.5}'::jsonb,
--    now() - interval '1 hour',
--    now() + interval '3 days',
--    'companion', 'coruja-sabia', 50);
--
-- -- 1b) Alternativa com conjunto PRÓPRIO de monstros + recompensa = Selo:
-- -- insert into public.events
-- --   (name, description, stage_override, starts_at, ends_at,
-- --    exclusive_reward_type, exclusive_reward_id, completion_goal)
-- -- values
-- --   ('Incursão Relâmpago',
-- --    'Três alvos especiais. Derrote-os em série para forjar um Selo exclusivo.',
-- --    '{"levelMultiplier": 2, "monsters": [
-- --        {"baseId": "gotinha", "name": "Gotinha Relâmpago", "level": 30},
-- --        {"baseId": "coelhal", "name": "Coelhal Relâmpago", "level": 35},
-- --        {"baseId": "salgueira-ancestral", "name": "Salgueira Relâmpago", "isBoss": true, "bossRank": "Mini"}
-- --      ]}'::jsonb,
-- --    now() - interval '1 hour', now() + interval '2 days',
-- --    'seal', 'selo-do-coelhal', 40);
--
-- -- 2) Chefe da Semana: MVP "Reflexo Sombrio" (id reflexo-sombrio), 4x de stats,
-- --    janela = 7 dias a partir de agora.
-- insert into public.weekly_boss
--   (monster_id, week_start, week_end, boosted_stats_multiplier)
-- values
--   ('reflexo-sombrio', now() - interval '1 hour', now() + interval '7 days', 4);
--
-- -- 3) O leaderboard_stage se popula sozinho: basta abrir a tela de Combate
-- --    com qualquer conta (o autosave grava a linha). Para semear um rival fake,
-- --    é preciso um player_id real já existente em public.players:
-- -- insert into public.leaderboard_stage
-- --   (player_id, character_name, job_id, progress_index, level)
-- -- values ('<PLAYER_ID_EXISTENTE>', 'Sentinela', 'sentinela', 25, 60)
-- -- on conflict (player_id) do update set
-- --   character_name = excluded.character_name, job_id = excluded.job_id,
-- --   progress_index = excluded.progress_index, level = excluded.level,
-- --   updated_at = now();

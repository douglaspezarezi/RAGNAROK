-- RAGNAROK — schema inicial (jogadores, personagem, coleções, sessões offline)
--
-- Rode via Supabase CLI (`supabase db push`) ou colando no SQL Editor do painel.
-- RLS: cada usuário autenticado só enxerga/edita os próprios dados.

-- ---------------------------------------------------------------------------
-- extensões
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- players : 1 por usuário de auth
-- ---------------------------------------------------------------------------
create table if not exists public.players (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid not null unique references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- characters : 1 por player (protótipo — sem múltiplos slots ainda)
--
-- Colunas pedidas na tarefa + `progress` (jsonb) para o que a lógica de
-- @game/core precisa persistir e não tem coluna dedicada: clearedChapters,
-- clearedStageIds, rebirthCount, equippedSeals.
-- ---------------------------------------------------------------------------
create table if not exists public.characters (
  id               uuid primary key default gen_random_uuid(),
  player_id        uuid not null unique references public.players (id) on delete cascade,
  job_id           text not null,
  level            integer not null default 1,
  xp               integer not null default 0,
  gold             bigint  not null default 0,
  current_stage_id text not null,
  base_attributes  jsonb not null default '{}'::jsonb,
  progress         jsonb not null default '{}'::jsonb,
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- player_companions : progresso por Companheiro
-- (`fragments` adicionado à lista da tarefa — paralelo ao acúmulo de fragmentos
--  do protótipo; `evolution_level`/`bond_level` derivam dele depois)
-- ---------------------------------------------------------------------------
create table if not exists public.player_companions (
  id              uuid primary key default gen_random_uuid(),
  player_id       uuid not null references public.players (id) on delete cascade,
  companion_id    text not null,
  evolution_level integer not null default 1,
  fragments       integer not null default 0,
  bond_level      integer not null default 0,
  unique (player_id, companion_id)
);

-- ---------------------------------------------------------------------------
-- player_seals : progresso por Selo
-- (`fragments` adicionado à lista da tarefa, mesmo motivo acima)
-- ---------------------------------------------------------------------------
create table if not exists public.player_seals (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references public.players (id) on delete cascade,
  seal_id       text not null,
  fragments     integer not null default 0,
  upgrade_level integer not null default 0,
  unique (player_id, seal_id)
);

-- ---------------------------------------------------------------------------
-- offline_sessions : histórico para auditoria dos cálculos de progresso offline
-- ---------------------------------------------------------------------------
create table if not exists public.offline_sessions (
  id              uuid primary key default gen_random_uuid(),
  character_id    uuid not null references public.characters (id) on delete cascade,
  started_at      timestamptz not null,
  ended_at        timestamptz not null,
  rewards_summary jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists offline_sessions_character_idx
  on public.offline_sessions (character_id, ended_at desc);

-- ---------------------------------------------------------------------------
-- trigger: cria o registro em players no signup
-- (o `character` inicial é criado pelo app, reaproveitando a lógica de
--  inicialização de lib/gameStore.ts — que depende de @game/data)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.players (auth_user_id)
  values (new.id)
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.players            enable row level security;
alter table public.characters         enable row level security;
alter table public.player_companions  enable row level security;
alter table public.player_seals       enable row level security;
alter table public.offline_sessions   enable row level security;

-- players: dono direto por auth.uid()
create policy "players_select_own" on public.players
  for select using (auth.uid() = auth_user_id);
create policy "players_insert_own" on public.players
  for insert with check (auth.uid() = auth_user_id);
create policy "players_update_own" on public.players
  for update using (auth.uid() = auth_user_id)
             with check (auth.uid() = auth_user_id);

-- characters: dono via players.player_id
create policy "characters_select_own" on public.characters
  for select using (exists (
    select 1 from public.players p
    where p.id = characters.player_id and p.auth_user_id = auth.uid()
  ));
create policy "characters_insert_own" on public.characters
  for insert with check (exists (
    select 1 from public.players p
    where p.id = characters.player_id and p.auth_user_id = auth.uid()
  ));
create policy "characters_update_own" on public.characters
  for update using (exists (
    select 1 from public.players p
    where p.id = characters.player_id and p.auth_user_id = auth.uid()
  )) with check (exists (
    select 1 from public.players p
    where p.id = characters.player_id and p.auth_user_id = auth.uid()
  ));

-- player_companions: dono via player_id
create policy "player_companions_select_own" on public.player_companions
  for select using (exists (
    select 1 from public.players p
    where p.id = player_companions.player_id and p.auth_user_id = auth.uid()
  ));
create policy "player_companions_insert_own" on public.player_companions
  for insert with check (exists (
    select 1 from public.players p
    where p.id = player_companions.player_id and p.auth_user_id = auth.uid()
  ));
create policy "player_companions_update_own" on public.player_companions
  for update using (exists (
    select 1 from public.players p
    where p.id = player_companions.player_id and p.auth_user_id = auth.uid()
  )) with check (exists (
    select 1 from public.players p
    where p.id = player_companions.player_id and p.auth_user_id = auth.uid()
  ));
create policy "player_companions_delete_own" on public.player_companions
  for delete using (exists (
    select 1 from public.players p
    where p.id = player_companions.player_id and p.auth_user_id = auth.uid()
  ));

-- player_seals: dono via player_id
create policy "player_seals_select_own" on public.player_seals
  for select using (exists (
    select 1 from public.players p
    where p.id = player_seals.player_id and p.auth_user_id = auth.uid()
  ));
create policy "player_seals_insert_own" on public.player_seals
  for insert with check (exists (
    select 1 from public.players p
    where p.id = player_seals.player_id and p.auth_user_id = auth.uid()
  ));
create policy "player_seals_update_own" on public.player_seals
  for update using (exists (
    select 1 from public.players p
    where p.id = player_seals.player_id and p.auth_user_id = auth.uid()
  )) with check (exists (
    select 1 from public.players p
    where p.id = player_seals.player_id and p.auth_user_id = auth.uid()
  ));
create policy "player_seals_delete_own" on public.player_seals
  for delete using (exists (
    select 1 from public.players p
    where p.id = player_seals.player_id and p.auth_user_id = auth.uid()
  ));

-- offline_sessions: dono via characters -> players
create policy "offline_sessions_select_own" on public.offline_sessions
  for select using (exists (
    select 1 from public.characters c
    join public.players p on p.id = c.player_id
    where c.id = offline_sessions.character_id and p.auth_user_id = auth.uid()
  ));
create policy "offline_sessions_insert_own" on public.offline_sessions
  for insert with check (exists (
    select 1 from public.characters c
    join public.players p on p.id = c.player_id
    where c.id = offline_sessions.character_id and p.auth_user_id = auth.uid()
  ));

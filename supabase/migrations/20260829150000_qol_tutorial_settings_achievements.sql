-- RAGNAROK — Qualidade de vida: onboarding, configurações e conquistas.
--
-- Rode depois das migrations 1–4 (SQL Editor ou `supabase db push`).

-- =========================================================================
-- TAREFA 1 + 2 — colunas em players / created_at do personagem
-- =========================================================================
alter table public.players
  add column if not exists tutorial_completed boolean not null default false,
  -- preferências do jogador: {"sound": true, "music": true, "combatSpeed": "normal"}
  add column if not exists settings jsonb not null default '{}'::jsonb;

alter table public.characters
  add column if not exists created_at timestamptz not null default now();

-- backfill: data de criação do personagem = data de criação do player (1 char/player)
update public.characters c
set created_at = p.created_at
from public.players p
where p.id = c.player_id
  and c.created_at > p.created_at;  -- só linhas ainda com o default recém-aplicado

-- =========================================================================
-- TAREFA 3 — Conquistas
-- =========================================================================

-- achievements : catálogo (definido aqui; o app só lê).
--   criteria_type ∈
--     reach_level | total_kills | clear_chapters | own_companion_tier_s |
--     own_companions | equip_all_seal_slots | own_seals | first_rebirth |
--     reach_rebirth | weekly_boss_win | claim_event_reward
--   criteria_value : limiar numérico (>= desbloqueia)
--   reward_type/reward_id : Companheiro/Selo concedido ao desbloquear (opcional)
create table if not exists public.achievements (
  id             text primary key,
  name           text not null,
  description    text not null,
  criteria_type  text not null,
  criteria_value integer not null default 1,
  reward_type    text check (reward_type in ('companion', 'seal')),
  reward_id      text,
  sort_order     integer not null default 0
);

create table if not exists public.player_achievements (
  player_id      uuid not null references public.players (id) on delete cascade,
  achievement_id text not null references public.achievements (id) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  primary key (player_id, achievement_id)
);

-- ---- seed do catálogo (20 conquistas sobre marcos que já existem) --------
insert into public.achievements
  (id, name, description, criteria_type, criteria_value, reward_type, reward_id, sort_order)
values
  ('nivel-5',            'Primeiros Passos',      'Alcance o nível 5.',                         'reach_level',           5,    null, null,                        10),
  ('nivel-25',           'Aventureiro',           'Alcance o nível 25.',                        'reach_level',           25,   null, null,                        11),
  ('nivel-50',           'Veterano',              'Alcance o nível 50.',                        'reach_level',           50,   null, null,                        12),
  ('nivel-100',          'Lendário',              'Alcance o nível 100.',                       'reach_level',           100,  'companion', 'guardiao-de-pedra',    13),
  ('kills-10',           'Caçador Iniciante',     'Derrote 10 monstros.',                       'total_kills',           10,   null, null,                        20),
  ('kills-100',          'Exterminador',          'Derrote 100 monstros.',                      'total_kills',           100,  null, null,                        21),
  ('kills-1000',         'Ceifador',              'Derrote 1.000 monstros.',                    'total_kills',           1000, 'companion', 'fera-das-brumas',      22),
  ('kills-10000',        'Cataclismo',            'Derrote 10.000 monstros.',                   'total_kills',           10000,null, null,                        23),
  ('cap-1',              'Fim do Começo',         'Conclua o primeiro capítulo.',              'clear_chapters',        1,    null, null,                        30),
  ('cap-3',              'Desbravador',           'Conclua 3 capítulos.',                       'clear_chapters',        3,    null, null,                        31),
  ('cap-5',              'Herói Regional',        'Conclua 5 capítulos.',                       'clear_chapters',        5,    'companion', 'coruja-sabia',         32),
  ('cap-10',             'Salvador de Elyndor',   'Conclua os 10 capítulos.',                   'clear_chapters',        10,   null, null,                        33),
  ('companheiro-s',      'Companhia Lendária',    'Tenha um Companheiro Tier S.',               'own_companion_tier_s',  1,    null, null,                        40),
  ('companheiros-5',     'Tratador',              'Tenha 5 Companheiros diferentes.',           'own_companions',        5,    null, null,                        41),
  ('selos-todos-slots',  'Totalmente Selado',     'Equipe um Selo em todos os 7 slots.',        'equip_all_seal_slots',  7,    null, null,                        50),
  ('selos-10',           'Colecionador de Selos', 'Tenha 10 Selos diferentes.',                 'own_seals',             10,   null, null,                        51),
  ('primeiro-rebirth',   'Renascido',             'Faça o primeiro renascimento.',             'first_rebirth',         1,    null, null,                        60),
  ('rebirth-3',          'Ciclo Eterno',          'Renasça 3 vezes.',                           'reach_rebirth',         3,    null, null,                        61),
  ('chefe-semanal',      'Matador de Titãs',      'Derrube o Chefe da Semana ao menos uma vez.','weekly_boss_win',       1,    'seal', 'selo-do-lobo-das-brumas',    70),
  ('evento-recompensa',  'Festeiro',              'Resgate a recompensa de um evento.',         'claim_event_reward',    1,    null, null,                        71)
on conflict (id) do update set
  name = excluded.name, description = excluded.description,
  criteria_type = excluded.criteria_type, criteria_value = excluded.criteria_value,
  reward_type = excluded.reward_type, reward_id = excluded.reward_id,
  sort_order = excluded.sort_order;

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table public.achievements        enable row level security;
alter table public.player_achievements enable row level security;

-- achievements: catálogo público para autenticados; sem escrita pelo cliente.
create policy "achievements_select_all" on public.achievements
  for select to authenticated using (true);

-- player_achievements: dono via player_id (sem update/delete — histórico imutável).
create policy "player_achievements_select_own" on public.player_achievements
  for select using (exists (
    select 1 from public.players p
    where p.id = player_achievements.player_id and p.auth_user_id = auth.uid()
  ));
create policy "player_achievements_insert_own" on public.player_achievements
  for insert with check (exists (
    select 1 from public.players p
    where p.id = player_achievements.player_id and p.auth_user_id = auth.uid()
  ));

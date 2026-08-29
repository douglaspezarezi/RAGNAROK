-- RAGNAROK — colunas para Equipar Selos, Invocação (gacha) e saldo de invocação.
-- Rode depois da migration inicial (SQL Editor ou `supabase db push`).

alter table public.characters
  -- slot de equipamento -> id do Selo equipado, ex: {"Arma": "selo-do-coelhal"}
  add column if not exists equipped_seals  jsonb  not null default '{}'::jsonb,
  -- saldo de Cristal de Invocação (moeda do gacha)
  add column if not exists summon_crystals bigint not null default 1000,
  -- contador de pity por banner: {"companion": 0, "seal": 0}
  add column if not exists summon_pity     jsonb  not null default '{"companion": 0, "seal": 0}'::jsonb;

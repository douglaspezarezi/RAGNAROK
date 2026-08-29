/**
 * Formatos das linhas do banco (escritos à mão — espelham
 * `supabase/migrations/20260829120000_init_game_schema.sql`).
 *
 * O cliente Supabase é usado sem tipagem gerada; estes tipos são aplicados nos
 * pontos de leitura em `persistence.ts`. Se depois rodar
 * `supabase gen types typescript`, dá pra plugar a saída no `createClient`.
 */

/** Conteúdo do `characters.progress` (jsonb). */
export interface CharacterProgress {
  rebirthCount: number;
  clearedChapters: number[];
  clearedStageIds: string[];
}

/** Contador de pity por banner (`characters.summon_pity`). */
export interface SummonPity {
  companion: number;
  seal: number;
}

export interface PlayerRow {
  id: string;
  auth_user_id: string;
  created_at: string;
  last_seen_at: string;
}

export interface CharacterRow {
  id: string;
  player_id: string;
  job_id: string;
  level: number;
  xp: number;
  gold: number;
  current_stage_id: string;
  base_attributes: Record<string, number>;
  progress: Partial<CharacterProgress>;
  /** slot de equipamento -> id do Selo equipado */
  equipped_seals: Record<string, string>;
  summon_crystals: number;
  summon_pity: Partial<SummonPity>;
  updated_at: string;
}

export interface PlayerCompanionRow {
  id: string;
  player_id: string;
  companion_id: string;
  evolution_level: number;
  fragments: number;
  bond_level: number;
}

export interface PlayerSealRow {
  id: string;
  player_id: string;
  seal_id: string;
  fragments: number;
  upgrade_level: number;
}

/* -------------------------------------------------------------------------- */
/*  Eventos Temporários + Rankings (migration 20260829140000)                  */
/* -------------------------------------------------------------------------- */

/**
 * `events.stage_override` (jsonb). Flexível para dois casos:
 *  - reaproveitar um capítulo do bestiário: `{ chapterNumber }`
 *  - conjunto próprio: `{ monsters: [{ baseId, name?, level?, isBoss?, bossRank? }] }`
 * `levelMultiplier` (opcional) escala o nível efetivo dos monstros do evento.
 */
export interface EventStageOverride {
  chapterNumber?: number;
  monsters?: {
    /** id de um monstro do bestiary.ts usado como molde. */
    baseId: string;
    name?: string;
    level?: number;
    isBoss?: boolean;
    bossRank?: "Mini" | "MVP";
  }[];
  levelMultiplier?: number;
}

export interface EventRow {
  id: string;
  name: string;
  description: string;
  stage_override: EventStageOverride;
  starts_at: string;
  ends_at: string;
  exclusive_reward_type: "companion" | "seal";
  exclusive_reward_id: string;
  completion_goal: number;
  is_active: boolean;
}

export interface EventProgressData {
  kills?: number;
  damage?: number;
}

export interface PlayerEventProgressRow {
  id: string;
  player_id: string;
  event_id: string;
  progress_data: EventProgressData;
  reward_claimed: boolean;
  updated_at: string;
}

export interface LeaderboardStageRow {
  player_id: string;
  character_name: string;
  job_id: string;
  progress_index: number;
  level: number;
  updated_at: string;
}

export interface WeeklyBossRow {
  id: string;
  monster_id: string;
  week_start: string;
  week_end: string;
  boosted_stats_multiplier: number;
  is_active: boolean;
}

export interface WeeklyBossAttemptRow {
  id: string;
  player_id: string;
  weekly_boss_id: string;
  character_name: string;
  damage_dealt: number;
  attempted_at: string;
}

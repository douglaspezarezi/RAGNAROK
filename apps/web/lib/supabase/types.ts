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
  equippedSeals: string[];
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

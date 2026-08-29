"use client";

/**
 * Ranking de Estágio — leitura assíncrona do Supabase.
 *
 * A escrita (`upsertLeaderboardStage`) é chamada por `persistence.ts` nos mesmos
 * momentos em que o personagem já é salvo — não há mecanismo de sync próprio.
 * A leitura pega todas as linhas (escala de protótipo), ordena e recorta o
 * top 100 no cliente, o que também dá a posição do próprio jogador de graça.
 */

import { JOBS_BY_ID } from "@game/data";

import type { GameSave } from "./gameSave";
import { stageProgressIndex } from "./progress";
import { getSupabase } from "./supabase/client";
import type { LeaderboardStageRow } from "./supabase/types";

const MAX_ROWS = 5000;

function logError(context: string, error: unknown): void {
  // eslint-disable-next-line no-console
  console.error(`[leaderboard] ${context}:`, error);
}

/** Nome de exibição do personagem (não há sistema de nome — usa o nome do job). */
export function characterDisplayName(jobId: string): string {
  return JOBS_BY_ID.get(jobId)?.name ?? jobId;
}

/**
 * Grava/atualiza a "fotografia" do jogador no ranking. Best-effort: um erro aqui
 * NUNCA deve derrubar o save do personagem — só loga.
 */
export async function upsertLeaderboardStage(
  playerId: string,
  save: GameSave,
): Promise<void> {
  try {
    const c = save.character;
    const row: LeaderboardStageRow = {
      player_id: playerId,
      character_name: characterDisplayName(c.jobId),
      job_id: c.jobId,
      progress_index: stageProgressIndex(c.currentStageId),
      level: c.level,
      updated_at: new Date().toISOString(),
    };
    const { error } = await getSupabase()
      .from("leaderboard_stage")
      .upsert(row, { onConflict: "player_id" });
    if (error) logError("upsert", error);
  } catch (e) {
    logError("upsert.throw", e);
  }
}

/** Compara duas linhas: mais avançado primeiro, empate por nível, depois quem chegou antes. */
export function compareStageRows(
  a: Pick<LeaderboardStageRow, "progress_index" | "level" | "updated_at">,
  b: Pick<LeaderboardStageRow, "progress_index" | "level" | "updated_at">,
): number {
  return (
    b.progress_index - a.progress_index ||
    b.level - a.level ||
    a.updated_at.localeCompare(b.updated_at)
  );
}

export interface LeaderboardView {
  /** Top 100 já ordenado. */
  top: LeaderboardStageRow[];
  /** Total de jogadores no ranking. */
  totalPlayers: number;
  /** Linha do próprio jogador (se existir) e sua posição 1-based. */
  self: { row: LeaderboardStageRow; rank: number } | null;
}

/** Lê o ranking inteiro, ordena e recorta o top 100 + posição do jogador. */
export async function fetchLeaderboard(
  selfPlayerId: string | null,
): Promise<LeaderboardView | null> {
  try {
    const { data, error } = await getSupabase()
      .from("leaderboard_stage")
      .select("*")
      .order("progress_index", { ascending: false })
      .order("level", { ascending: false })
      .order("updated_at", { ascending: true })
      .limit(MAX_ROWS);

    if (error) {
      logError("fetch", error);
      return null;
    }

    const rows = ((data ?? []) as LeaderboardStageRow[]).slice();
    rows.sort(compareStageRows);

    const selfIdx = selfPlayerId
      ? rows.findIndex((r) => r.player_id === selfPlayerId)
      : -1;

    return {
      top: rows.slice(0, 100),
      totalPlayers: rows.length,
      self:
        selfIdx >= 0 ? { row: rows[selfIdx], rank: selfIdx + 1 } : null,
    };
  } catch (e) {
    logError("fetch.throw", e);
    return null;
  }
}

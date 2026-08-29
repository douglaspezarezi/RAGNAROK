"use client";

/**
 * Ranking de Chefe Semanal / Boss Rush (GDD 8.5).
 *
 * Uma tentativa = um "burst" determinístico de combate contra o chefe reforçado,
 * resolvido por `simulateCombatTick` de `@game/core` (nenhuma regra duplicada).
 * O dano total causado na tentativa é o que entra no ranking.
 *
 * O `boosted_stats_multiplier` é aplicado SEM tocar em `@game/core`: elevamos o
 * nível efetivo do monstro (HP/ATQ/DEF de monstro escalam ~linearmente com o
 * nível em `deriveMonsterStats`), o que reforça o chefe de forma proporcional.
 */

import { MONSTERS_BY_ID, type Monster } from "@game/data";
import {
  calculateDerivedStats,
  deriveMonsterStats,
  simulateCombatTick,
} from "@game/core";

import { getSave } from "./gameStore";
import { getSupabase } from "./supabase/client";
import type { WeeklyBossAttemptRow, WeeklyBossRow } from "./supabase/types";

/** Duração simulada de uma tentativa, em segundos. */
export const ATTEMPT_SECONDS = 60;
/** Limite simples para a tentativa não virar "quem tem mais tempo livre". */
export const MAX_ATTEMPTS_PER_DAY = 3;

function logError(context: string, error: unknown): void {
  // eslint-disable-next-line no-console
  console.error(`[weeklyBoss] ${context}:`, error);
}

/**
 * Monstro-base do chefe reforçado: mesmo monstro do bestiário com o nível
 * efetivo multiplicado por `multiplier` (aproxima "stats × multiplier").
 */
export function boostedBossMonster(
  base: Monster,
  multiplier: number,
): Monster {
  const m = Math.max(1, multiplier);
  return {
    ...base,
    level: Math.max(1, Math.round(base.level * m)),
    name: `${base.name} — Reforçado ×${m}`,
  };
}

export interface BossAttemptResult {
  /** Dano total causado ao chefe na tentativa (o que entra no ranking). */
  damage: number;
  /** HP máximo do chefe reforçado — referência para "chegou a derrubar?". */
  bossMaxHp: number;
  wouldKill: boolean;
}

/**
 * Roda uma tentativa contra o chefe reforçado usando o personagem atual.
 * Determinístico (valor esperado) — sem RNG.
 */
export function runBossAttempt(
  base: Monster,
  multiplier: number,
): BossAttemptResult {
  const boss = boostedBossMonster(base, multiplier);
  const derived = calculateDerivedStats(getSave().character);
  const tick = simulateCombatTick(derived, boss, ATTEMPT_SECONDS);
  const bossMaxHp = deriveMonsterStats(boss).maxHp;
  const damage = Math.max(0, Math.round(tick.damageDealt));
  return { damage, bossMaxHp, wouldKill: damage >= bossMaxHp };
}

/* -------------------------------------------------------------------------- */
/*  I/O Supabase                                                               */
/* -------------------------------------------------------------------------- */

/** Chefe da semana ativo (`is_active` e `week_start <= now <= week_end`). */
export async function fetchCurrentWeeklyBoss(): Promise<WeeklyBossRow | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await getSupabase()
    .from("weekly_boss")
    .select("*")
    .eq("is_active", true)
    .lte("week_start", nowIso)
    .gte("week_end", nowIso)
    .order("week_start", { ascending: false })
    .limit(1);

  if (error) {
    logError("fetchCurrentWeeklyBoss", error);
    throw error;
  }
  const rows = (data ?? []) as WeeklyBossRow[];
  return rows[0] ?? null;
}

/** Resolve o `Monster` do bestiário a partir do `monster_id` do chefe. */
export function weeklyBossMonster(row: WeeklyBossRow): Monster | null {
  return MONSTERS_BY_ID.get(row.monster_id) ?? null;
}

/** Todas as tentativas de um chefe (para o ranking). */
export async function fetchBossAttempts(
  weeklyBossId: string,
): Promise<WeeklyBossAttemptRow[]> {
  const { data, error } = await getSupabase()
    .from("weekly_boss_attempts")
    .select("*")
    .eq("weekly_boss_id", weeklyBossId)
    .order("damage_dealt", { ascending: false })
    .limit(2000);

  if (error) {
    logError("fetchBossAttempts", error);
    throw error;
  }
  return (data ?? []) as WeeklyBossAttemptRow[];
}

/** Registra uma tentativa. */
export async function submitBossAttempt(
  playerId: string,
  weeklyBossId: string,
  characterName: string,
  damageDealt: number,
): Promise<boolean> {
  const { error } = await getSupabase().from("weekly_boss_attempts").insert({
    player_id: playerId,
    weekly_boss_id: weeklyBossId,
    character_name: characterName,
    damage_dealt: Math.max(0, Math.round(damageDealt)),
  });
  if (error) {
    logError("submitBossAttempt", error);
    return false;
  }
  return true;
}

/** Quantas tentativas o jogador já fez hoje (dia local) neste chefe. */
export function countAttemptsToday(
  attempts: WeeklyBossAttemptRow[],
  playerId: string,
): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();
  return attempts.filter(
    (a) =>
      a.player_id === playerId &&
      new Date(a.attempted_at).getTime() >= startMs,
  ).length;
}

export interface BossRankingRow {
  playerId: string;
  characterName: string;
  bestDamage: number;
  attempts: number;
  lastAt: string;
}

/** Melhor dano por jogador, já ordenado (maior primeiro). */
export function bestPerPlayer(
  attempts: WeeklyBossAttemptRow[],
): BossRankingRow[] {
  const byPlayer = new Map<string, BossRankingRow>();
  for (const a of attempts) {
    const cur = byPlayer.get(a.player_id);
    if (!cur) {
      byPlayer.set(a.player_id, {
        playerId: a.player_id,
        characterName: a.character_name,
        bestDamage: a.damage_dealt,
        attempts: 1,
        lastAt: a.attempted_at,
      });
      continue;
    }
    cur.attempts += 1;
    if (a.damage_dealt > cur.bestDamage) {
      cur.bestDamage = a.damage_dealt;
      cur.characterName = a.character_name;
    }
    if (a.attempted_at > cur.lastAt) cur.lastAt = a.attempted_at;
  }
  return [...byPlayer.values()].sort(
    (x, y) => y.bestDamage - x.bestDamage || x.lastAt.localeCompare(y.lastAt),
  );
}

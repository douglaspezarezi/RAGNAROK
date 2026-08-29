/**
 * Progresso offline (GDD seção 8.1).
 *
 * Fórmula do GDD:
 *   Recompensa_offline = Recompensa_por_hora_no_estágio_atual
 *                        × horas_offline
 *                        × fator_eficiência
 *
 * com `horas_offline` limitado por um teto (`OFFLINE_CAP_HOURS`) e
 * `fator_eficiência` (`OFFLINE_EFFICIENCY_FACTOR`) < 1 para o farm ativo seguir
 * mais vantajoso. Ambos ficam como constantes nomeadas e fáceis de ajustar.
 *
 * Convenção: `stageId` é o `id` do monstro farmado naquele estágio.
 * Função pura.
 */

import { MONSTERS_BY_ID, type Monster } from "@game/data";
import type { CharacterState } from "./character";
import { killBaseRewards, resolveMonsterDefeat } from "./combat";
import { bossFactorKey } from "./monster";
import { getRebirthMultiplier } from "./rebirth";

/** Teto de horas de progresso offline acumulável (GDD: "8 horas"). */
export const OFFLINE_CAP_HOURS = 8;

/** Fator de eficiência do farm offline vs. ativo (GDD: "ex.: 70%"). */
export const OFFLINE_EFFICIENCY_FACTOR = 0.7;

export const OFFLINE_TUNING = {
  /** Kills/hora num estágio nominal (≈ 1 kill a cada 4s). */
  KILLS_PER_HOUR_BASE: 900,
  /** Penalidade de kills/hora por nível do monstro do estágio. */
  KILLS_PER_HOUR_LEVEL_PENALTY: 1.5,
  /** Piso de kills/hora (estágios muito altos). */
  MIN_KILLS_PER_HOUR: 60,
  /** Estágios de chefe rendem menos kills/hora. */
  BOSS_KILLS_PER_HOUR_FACTOR: 0.15,
} as const;

export interface OfflineRewardsSummary {
  stageId: string;
  /** `false` se `stageId` não corresponde a nenhum monstro conhecido. */
  stageResolved: boolean;

  offlineSecondsRequested: number;
  /** Segundos efetivamente creditados (após teto e clamp em 0). */
  offlineSecondsCredited: number;
  creditedHours: number;
  /** `true` se o tempo pedido excedeu o teto. */
  wasCapped: boolean;

  capHours: number;
  efficiencyFactor: number;
  rebirthMultiplier: number;

  /** Estimativa de kills no período offline. */
  estimatedKills: number;
  xp: number;
  gold: number;
  sealFragments: { sealId: string; amount: number } | null;
  companionFragments: { companionId: string; amount: number } | null;
}

function killsPerHourFor(monster: Monster): number {
  const raw =
    OFFLINE_TUNING.KILLS_PER_HOUR_BASE -
    OFFLINE_TUNING.KILLS_PER_HOUR_LEVEL_PENALTY * monster.level;
  const withFloor = Math.max(OFFLINE_TUNING.MIN_KILLS_PER_HOUR, raw);
  return bossFactorKey(monster) === "none"
    ? withFloor
    : withFloor * OFFLINE_TUNING.BOSS_KILLS_PER_HOUR_FACTOR;
}

function emptySummary(
  stageId: string,
  requested: number,
  credited: number,
  wasCapped: boolean,
  rebirthMultiplier: number,
  stageResolved: boolean,
): OfflineRewardsSummary {
  return {
    stageId,
    stageResolved,
    offlineSecondsRequested: requested,
    offlineSecondsCredited: credited,
    creditedHours: Math.round((credited / 3600) * 1000) / 1000,
    wasCapped,
    capHours: OFFLINE_CAP_HOURS,
    efficiencyFactor: OFFLINE_EFFICIENCY_FACTOR,
    rebirthMultiplier,
    estimatedKills: 0,
    xp: 0,
    gold: 0,
    sealFragments: null,
    companionFragments: null,
  };
}

/**
 * Calcula as recompensas acumuladas enquanto o jogador esteve fora.
 *
 * - `offlineSeconds` negativo ou 0 -> tudo zero.
 * - `offlineSeconds` acima do teto -> creditado só o teto, `wasCapped: true`.
 * - `stageId` desconhecido -> tudo zero, `stageResolved: false`.
 *
 * Pura: não muta `character`.
 */
export function calculateOfflineRewards(
  character: CharacterState,
  stageId: string,
  offlineSeconds: number,
): OfflineRewardsSummary {
  const rebirthMultiplier = getRebirthMultiplier(character);
  const capSeconds = OFFLINE_CAP_HOURS * 3600;

  const requested = Number.isFinite(offlineSeconds) ? offlineSeconds : 0;
  const credited = Math.min(capSeconds, Math.max(0, requested));
  const wasCapped = requested > capSeconds;

  const monster = MONSTERS_BY_ID.get(stageId);
  if (!monster || credited === 0) {
    return emptySummary(
      stageId,
      requested,
      credited,
      wasCapped,
      rebirthMultiplier,
      monster !== undefined,
    );
  }

  const hours = credited / 3600;
  const killsPerHour = killsPerHourFor(monster);
  const effectiveKills = killsPerHour * hours * OFFLINE_EFFICIENCY_FACTOR;

  const base = killBaseRewards(monster);
  const xp = Math.round(base.xp * effectiveKills * rebirthMultiplier);
  const gold = Math.round(base.gold * effectiveKills * rebirthMultiplier);

  // Reaproveita as chances de drop já calculadas para o kill ativo.
  const defeat = resolveMonsterDefeat(monster, character);
  const sealFragments = defeat.sealFragment
    ? {
        sealId: defeat.sealFragment.sealId,
        amount: Math.floor(effectiveKills * defeat.sealFragment.dropChance),
      }
    : null;
  const companionFragments = defeat.companionFragment
    ? {
        companionId: defeat.companionFragment.companionId,
        amount: Math.floor(
          effectiveKills * defeat.companionFragment.dropChance,
        ),
      }
    : null;

  return {
    stageId,
    stageResolved: true,
    offlineSecondsRequested: requested,
    offlineSecondsCredited: credited,
    creditedHours: Math.round(hours * 1000) / 1000,
    wasCapped,
    capHours: OFFLINE_CAP_HOURS,
    efficiencyFactor: OFFLINE_EFFICIENCY_FACTOR,
    rebirthMultiplier,
    estimatedKills: Math.round(effectiveKills),
    xp,
    gold,
    sealFragments,
    companionFragments,
  };
}

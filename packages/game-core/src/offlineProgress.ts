/**
 * Progresso offline (GDD seção 8.1).
 *
 * Fórmula do GDD:
 *   Recompensa_offline = Recompensa_por_hora_no_estágio_atual
 *                        × horas_offline
 *                        × fator_eficiência
 *
 * "Recompensa_por_hora" agora vem do **DPS real do personagem** no estágio
 * (mesma resolução de `simulateCombatTick`: `kills/h = DPS / HP_do_monstro × 3600`),
 * em vez de uma heurística `f(nível_do_monstro)` que não acompanhava a força do
 * personagem. Com isso, offline ≈ `OFFLINE_EFFICIENCY_FACTOR` do farm ativo por
 * construção. `horas_offline` é limitado por `OFFLINE_CAP_HOURS`.
 *
 * Convenção: `stageId` é o `id` do monstro farmado naquele estágio.
 * Função pura (determinística — sem RNG).
 */

import { MONSTERS_BY_ID, type Monster } from "@game/data";
import { calculateDerivedStats, type CharacterState } from "./character";
import {
  killBaseRewards,
  resolveMonsterDefeat,
  simulateCombatTick,
} from "./combat";
import { getRebirthMultiplier } from "./rebirth";

/** Teto de horas de progresso offline acumulável (GDD: "8 horas"). */
export const OFFLINE_CAP_HOURS = 8;

/** Fator de eficiência do farm offline vs. ativo (GDD: "ex.: 70%"). */
export const OFFLINE_EFFICIENCY_FACTOR = 0.7;

export const OFFLINE_TUNING = {
  /** Piso de kills/hora (evita que um estágio quase invencível zere o offline). */
  MIN_KILLS_PER_HOUR: 60,
  /** Teto de sanidade para os kills/hora derivados do combate. */
  MAX_KILLS_PER_HOUR: 7200,
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

/**
 * Kills/hora reais do personagem no estágio: `DPS / HP_do_monstro × 3600`, com
 * piso/teto de sanidade. O HP de chefe (multiplicador de `deriveMonsterStats`)
 * já entra aqui via `simulateCombatTick`, então não precisa de fator separado.
 * Retorna 0 se o personagem não consegue causar dano ao monstro.
 */
function killsPerHourFor(character: CharacterState, monster: Monster): number {
  const tick = simulateCombatTick(calculateDerivedStats(character), monster, 1);
  if (tick.damageDealt <= 0) return 0;
  const perHour = (tick.damageDealt / tick.monsterMaxHp) * 3600;
  return Math.min(
    OFFLINE_TUNING.MAX_KILLS_PER_HOUR,
    Math.max(OFFLINE_TUNING.MIN_KILLS_PER_HOUR, perHour),
  );
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
  const killsPerHour = killsPerHourFor(character, monster);
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

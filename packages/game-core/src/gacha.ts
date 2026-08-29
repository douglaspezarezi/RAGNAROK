/**
 * Sistema de Invocação / Gacha (GDD seção 8.2).
 *
 * - Taxas por tier: C ~50%, B ~30%, A ~15%, S ~5%.
 * - Pity: após `PITY_THRESHOLD` invocações seguidas sem Tier S, a próxima é
 *   Tier S garantido.
 * - Duplicata: se o item sorteado já é possuído, o resultado indica
 *   `outcome: "duplicate"` e devolve fragmentos em vez da cópia. A checagem de
 *   posse é opcional — sem `ownedIds`, o resultado sai como `"new"` e o chamador
 *   decide o que fazer.
 *
 * `rollSummon` é pura/determinística DADO um `rng` (mesma sequência de números
 * -> mesmo resultado). O default `Math.random` existe só por conveniência.
 */

import {
  BATTLE_SEALS,
  COMPANIONS,
  type CompanionTier,
  type SealRarity,
} from "@game/data";

export type BannerType = "companion" | "seal";
export type ItemKind = "companion" | "seal";

/** Fonte de aleatoriedade: função sem argumentos que devolve `[0, 1)`. */
export type RandomSource = () => number;

/** Taxas por tier (GDD seção 8.2). Devem somar 1. */
export const SUMMON_RATES: Readonly<Record<CompanionTier, number>> = {
  C: 0.5,
  B: 0.3,
  A: 0.15,
  S: 0.05,
};

/** Ordem de sorteio, do mais comum ao mais raro. */
const TIER_ORDER: readonly CompanionTier[] = ["C", "B", "A", "S"];

/** Invocações seguidas sem Tier S que ativam a garantia (GDD: "ex.: 60"). */
export const PITY_THRESHOLD = 60;

/** Fragmentos devolvidos por uma duplicata, por tier. */
export const DUPLICATE_FRAGMENTS_BY_TIER: Readonly<Record<CompanionTier, number>> =
  {
    C: 5,
    B: 10,
    A: 20,
    S: 40,
  };

/** Raridades de Selo elegíveis por tier no banner de Selos. */
export const SEAL_RARITIES_BY_TIER: Readonly<Record<CompanionTier, SealRarity[]>> =
  {
    C: ["Comum"],
    B: ["Incomum"],
    A: ["Raro", "Épico"],
    S: ["Lendário"],
  };

export interface SummonResult {
  bannerType: BannerType;
  tier: CompanionTier;
  itemId: string;
  itemKind: ItemKind;

  /** `true` se o tier saiu por garantia de pity (não por sorteio). */
  guaranteedByPity: boolean;
  pityCounterBefore: number;
  /** Pity após esta invocação: 0 se saiu Tier S, senão `before + 1`. */
  pityCounterAfter: number;

  /** `true` se `options.ownedIds` foi informado e contém `itemId`. */
  isDuplicate: boolean;
  outcome: "new" | "duplicate";
  /** Fragmentos concedidos — só > 0 quando `isDuplicate`. */
  fragmentsAwarded: number;
}

export interface RollSummonOptions {
  /** Ids que o jogador já possui, para resolver duplicata em fragmentos. */
  ownedIds?: ReadonlySet<string>;
}

/** Sorteia um tier pelas taxas de `SUMMON_RATES` a partir de `roll` em `[0,1)`. */
function pickTier(roll: number): CompanionTier {
  let cumulative = 0;
  for (const tier of TIER_ORDER) {
    cumulative += SUMMON_RATES[tier];
    if (roll < cumulative) return tier;
  }
  return "S"; // proteção contra erro de ponto flutuante
}

/** Pool de ids para um tier num banner, com fallback descendo de tier. */
function poolForTier(bannerType: BannerType, tier: CompanionTier): string[] {
  for (let i = TIER_ORDER.indexOf(tier); i >= 0; i--) {
    const t = TIER_ORDER[i]!;
    const ids =
      bannerType === "companion"
        ? COMPANIONS.filter((c) => c.tier === t).map((c) => c.id)
        : BATTLE_SEALS.filter((s) =>
            SEAL_RARITIES_BY_TIER[t].includes(s.rarity),
          ).map((s) => s.id);
    if (ids.length > 0) return ids;
  }
  // Último recurso: qualquer item do banner.
  return bannerType === "companion"
    ? COMPANIONS.map((c) => c.id)
    : BATTLE_SEALS.map((s) => s.id);
}

/**
 * Executa uma invocação.
 *
 * @param bannerType  `"companion"` ou `"seal"`.
 * @param pityCounter Invocações seguidas sem Tier S até agora (>= 0).
 * @param rng         Fonte de aleatoriedade; default `Math.random`.
 * @param options     `ownedIds` opcional para marcar duplicata.
 */
export function rollSummon(
  bannerType: BannerType,
  pityCounter: number,
  rng: RandomSource = Math.random,
  options: RollSummonOptions = {},
): SummonResult {
  const pityBefore = Math.max(0, Math.floor(pityCounter));
  const guaranteedByPity = pityBefore >= PITY_THRESHOLD;

  const tier: CompanionTier = guaranteedByPity ? "S" : pickTier(rng());

  const pool = poolForTier(bannerType, tier);
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  const itemId = pool[Math.max(0, index)]!;

  const pityAfter = tier === "S" ? 0 : pityBefore + 1;

  const isDuplicate = options.ownedIds?.has(itemId) ?? false;
  const fragmentsAwarded = isDuplicate ? DUPLICATE_FRAGMENTS_BY_TIER[tier] : 0;

  return {
    bannerType,
    tier,
    itemId,
    itemKind: bannerType,
    guaranteedByPity,
    pityCounterBefore: pityBefore,
    pityCounterAfter: pityAfter,
    isDuplicate,
    outcome: isDuplicate ? "duplicate" : "new",
    fragmentsAwarded,
  };
}

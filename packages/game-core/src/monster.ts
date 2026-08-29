/**
 * Derivação de status de combate de um monstro a partir do seu registro em
 * `@game/data` (que só carrega nível, raça, elemento, tamanho e flags de chefe).
 *
 * Fórmulas PLACEHOLDER, concentradas em `MONSTER_TUNING` / `BOSS_MULTIPLIER`.
 * Função pura.
 */

import type {
  ElementLevel,
  Monster,
  MonsterElement,
  MonsterRace,
  MonsterSize,
} from "@game/data";

/** Chave de escala de chefe. */
export type BossFactorKey = "none" | "Mini" | "MVP" | "MVP_FINAL";

export const MONSTER_TUNING = {
  BASE_HP: 30,
  HP_PER_LEVEL: 22,

  BASE_ATK: 8,
  ATK_PER_LEVEL: 3.2,

  DEF_PER_LEVEL: 0.6,
  MDEF_PER_LEVEL: 0.4,

  BASE_ASPD: 0.7,
  ASPD_PER_LEVEL: 0.002,
  ASPD_MAX: 2.5,

  FLEE_PER_LEVEL: 1.2,
  HIT_PER_LEVEL: 1.5,
} as const;

/** Multiplicador aplicado a HP/ATQ de chefes. */
export const BOSS_MULTIPLIER: Readonly<Record<BossFactorKey, number>> = {
  none: 1,
  Mini: 6,
  MVP: 20,
  MVP_FINAL: 40,
};

/**
 * Resistência elemental do monstro por nível do seu elemento, em %.
 * Nível 3 = 100% => imunidade total a ataques daquele elemento.
 */
export const ELEMENT_RESIST_BY_LEVEL: Readonly<Record<ElementLevel, number>> = {
  1: 25,
  2: 50,
  3: 100,
};

export interface MonsterStats {
  monsterId: string;
  level: number;
  maxHp: number;
  atk: number;
  def: number;
  mdef: number;
  aspd: number;
  flee: number;
  hit: number;
  race: MonsterRace;
  element: MonsterElement;
  elementLevel: ElementLevel;
  size: MonsterSize;
  bossFactorKey: BossFactorKey;
  bossFactor: number;
}

/** Classifica a escala de chefe de um monstro. */
export function bossFactorKey(monster: Monster): BossFactorKey {
  if (monster.isFinalBoss) return "MVP_FINAL";
  if (monster.bossRank === "MVP") return "MVP";
  if (monster.bossRank === "Mini") return "Mini";
  return "none";
}

/** Deriva os status de combate de um monstro. Função pura. */
export function deriveMonsterStats(monster: Monster): MonsterStats {
  const M = MONSTER_TUNING;
  const level = Math.max(1, monster.level);
  const key = bossFactorKey(monster);
  const factor = BOSS_MULTIPLIER[key];

  return {
    monsterId: monster.id,
    level,
    maxHp: Math.round((M.BASE_HP + M.HP_PER_LEVEL * level) * factor),
    atk: Math.round((M.BASE_ATK + M.ATK_PER_LEVEL * level) * factor),
    def: Math.round(M.DEF_PER_LEVEL * level),
    mdef: Math.round(M.MDEF_PER_LEVEL * level),
    aspd: Math.min(M.ASPD_MAX, M.BASE_ASPD + M.ASPD_PER_LEVEL * level),
    flee: Math.round(M.FLEE_PER_LEVEL * level),
    hit: Math.round(M.HIT_PER_LEVEL * level),
    race: monster.race,
    element: monster.element,
    elementLevel: monster.elementLevel,
    size: monster.size,
    bossFactorKey: key,
    bossFactor: factor,
  };
}

/**
 * Resistência do monstro a um ataque de determinado elemento, em % (0–100).
 * - ataque Neutro: sem modificador (0)
 * - ataque do mesmo elemento do monstro: resiste conforme o nível elemental
 * - ataque de elemento diferente: 0 (tabela completa de fraquezas fica como TODO)
 */
export function monsterElementalResistPercent(
  monster: Pick<Monster, "element" | "elementLevel">,
  attackElement: MonsterElement,
): number {
  if (attackElement === "Neutro") return 0;
  if (attackElement === monster.element) {
    return ELEMENT_RESIST_BY_LEVEL[monster.elementLevel];
  }
  return 0;
}

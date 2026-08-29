/**
 * Núcleo de combate — funções puras e determinísticas.
 *
 * O combate idle é resolvido por VALOR ESPERADO (sem RNG): crítico, esquiva e
 * bloqueio entram como frações, não como sorteios. Assim o mesmo par
 * (personagem, monstro) sempre produz o mesmo resultado — fácil de testar e de
 * usar em simulações de progresso.
 *
 * Fórmulas PLACEHOLDER concentradas em `COMBAT_TUNING` / `REWARD_TUNING`.
 */

import {
  BATTLE_SEALS,
  type Monster,
  type MonsterElement,
  type MonsterRace,
} from "@game/data";
import type { CharacterState, DamageModifierTable, DerivedStats } from "./character";
import {
  bossFactorKey,
  deriveMonsterStats,
  monsterElementalResistPercent,
  type BossFactorKey,
} from "./monster";
import { getRebirthMultiplier } from "./rebirth";

/* -------------------------------------------------------------------------- */
/*  simulateCombatTick                                                         */
/* -------------------------------------------------------------------------- */

export const COMBAT_TUNING = {
  /** Dano de um crítico = golpe normal × este fator. */
  CRIT_DAMAGE_MULT: 1.5,
  /** Um bloqueio remove esta fração do golpe. */
  BLOCK_DAMAGE_REDUCTION: 0.4,
  /** Piso de dano por golpe (nunca zera por DEF). */
  MIN_DAMAGE: 1,
  /** Limites da taxa de acerto do monstro contra o personagem. */
  HIT_RATE_FLOOR: 0.05,
  HIT_RATE_CEIL: 1,
  /** Constante que suaviza a curva acerto vs. esquiva. */
  HIT_RATE_SOFTNESS: 80,
} as const;

export interface CombatTickResult {
  monsterId: string;
  deltaSeconds: number;

  /** Número (fracionário) de golpes do personagem no intervalo. */
  playerAttacks: number;
  /** Número (fracionário) de golpes do monstro no intervalo. */
  monsterAttacks: number;

  /** Dano total causado ao monstro no intervalo (inclui reflexão). */
  damageDealt: number;
  /** Dano total sofrido pelo personagem no intervalo (após esquiva/mitigação). */
  damageTaken: number;
  /** Parte de `damageDealt` que veio de reflexão de dano. */
  reflectedDamage: number;

  /** Fração dos golpes do monstro que conectam (0–1). */
  hitRateAgainstPlayer: number;
  /** Resistência elemental efetiva do monstro ao ataque do personagem (%). */
  elementalResistPercent: number;
  /** Multiplicador de dano causado aplicado (raça/elemento/crit). */
  damageDealtMultiplier: number;
  /** Multiplicador de dano recebido aplicado (raça/elemento/bloqueio). */
  damageTakenMultiplier: number;

  monsterMaxHp: number;
  /** HP restante assumindo que o monstro começou o tick cheio. */
  monsterHpRemaining: number;
  /** `true` se `damageDealt >= monsterMaxHp`. */
  monsterDefeated: boolean;
  overkill: number;

  estimatedDps: number;
  /** Segundos para derrubar o monstro no ritmo atual (`Infinity` se DPS 0). */
  estimatedTimeToKillSeconds: number;
}

function tableMultiplier(
  table: DamageModifierTable,
  race: MonsterRace,
  element: MonsterElement,
): number {
  const fromRace = table.vsRace[race] ?? 0;
  const fromElement = table.vsElement[element] ?? 0;
  const fromAllElemental = element === "Neutro" ? 0 : table.allElemental;
  return 1 + (fromRace + fromElement + fromAllElemental) / 100;
}

function zeroTick(
  monsterId: string,
  deltaSeconds: number,
  monsterMaxHp: number,
): CombatTickResult {
  return {
    monsterId,
    deltaSeconds: Math.max(0, deltaSeconds),
    playerAttacks: 0,
    monsterAttacks: 0,
    damageDealt: 0,
    damageTaken: 0,
    reflectedDamage: 0,
    hitRateAgainstPlayer: 0,
    elementalResistPercent: 0,
    damageDealtMultiplier: 0,
    damageTakenMultiplier: 0,
    monsterMaxHp,
    monsterHpRemaining: monsterMaxHp,
    monsterDefeated: false,
    overkill: 0,
    estimatedDps: 0,
    estimatedTimeToKillSeconds: Number.POSITIVE_INFINITY,
  };
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Simula `deltaSeconds` de combate 1×1 entre um personagem (já com status
 * derivados) e um monstro. Pura e determinística.
 *
 * Modelo de dano por golpe (subtrativo, com piso `MIN_DAMAGE`):
 *   - personagem: `max(MIN, atk - DEF_mon)` ou `max(MIN, matk - MDEF_mon)`
 *     conforme `attackType`, × multiplicador de crítico esperado
 *     (`1 + critChance × (CRIT_DAMAGE_MULT - 1)`)
 *     × multiplicador de dano vs raça/elemento
 *     × `(1 - resistência_elemental)`
 *   - monstro: `max(MIN, atk_mon - DEF)` × multiplicador de dano recebido
 *     vs raça/elemento × `(1 - bloqueio_esperado)`, aplicado só à fração de
 *     golpes que conectam (`hitRate`).
 */
export function simulateCombatTick(
  character: DerivedStats,
  monster: Monster,
  deltaSeconds: number,
): CombatTickResult {
  const mon = deriveMonsterStats(monster);

  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return zeroTick(monster.id, deltaSeconds, mon.maxHp);
  }

  // ---- dano causado ao monstro --------------------------------------
  const rawPerHit =
    character.attackType === "magical"
      ? Math.max(COMBAT_TUNING.MIN_DAMAGE, character.matk - mon.mdef)
      : Math.max(COMBAT_TUNING.MIN_DAMAGE, character.atk - mon.def);

  const critMult =
    1 + (character.critChance / 100) * (COMBAT_TUNING.CRIT_DAMAGE_MULT - 1);

  const dealtTableMult = Math.max(
    0,
    tableMultiplier(character.damageDealt, mon.race, mon.element),
  );

  const elementalResistPercent = monsterElementalResistPercent(
    monster,
    character.attackElement,
  );
  const elementalMult = 1 - elementalResistPercent / 100;

  const damageDealtMultiplier = critMult * dealtTableMult * elementalMult;
  const perHitDealt = rawPerHit * damageDealtMultiplier;

  const playerAttacks = character.aspd * deltaSeconds;
  const directDamage = perHitDealt * playerAttacks;

  // ---- dano recebido pelo personagem ------------------------------
  const rawPerHitTaken = Math.max(
    COMBAT_TUNING.MIN_DAMAGE,
    mon.atk - character.def,
  );

  const effectiveFlee =
    character.flee + (character.fleeVsRace[mon.race] ?? 0);
  const hitRate = clamp(
    (mon.hit + COMBAT_TUNING.HIT_RATE_SOFTNESS) /
      (mon.hit + COMBAT_TUNING.HIT_RATE_SOFTNESS + Math.max(0, effectiveFlee)),
    COMBAT_TUNING.HIT_RATE_FLOOR,
    COMBAT_TUNING.HIT_RATE_CEIL,
  );

  const takenTableMult = Math.max(
    0,
    tableMultiplier(character.damageTaken, mon.race, mon.element),
  );
  const blockMitigation =
    (character.blockChance / 100) * COMBAT_TUNING.BLOCK_DAMAGE_REDUCTION;
  const damageTakenMultiplier = takenTableMult * (1 - blockMitigation);

  const monsterAttacks = mon.aspd * deltaSeconds;
  const damageTaken =
    rawPerHitTaken * damageTakenMultiplier * hitRate * monsterAttacks;

  // ---- reflexão -------------------------------------------------
  const reflectedDamage = damageTaken * (character.reflectPercent / 100);
  const damageDealt = directDamage + reflectedDamage;

  const monsterDefeated = damageDealt >= mon.maxHp;
  const estimatedDps = damageDealt / deltaSeconds;

  return {
    monsterId: monster.id,
    deltaSeconds,
    playerAttacks: round2(playerAttacks),
    monsterAttacks: round2(monsterAttacks),
    damageDealt: round2(damageDealt),
    damageTaken: round2(damageTaken),
    reflectedDamage: round2(reflectedDamage),
    hitRateAgainstPlayer: round2(hitRate),
    elementalResistPercent,
    damageDealtMultiplier: round2(damageDealtMultiplier),
    damageTakenMultiplier: round2(damageTakenMultiplier),
    monsterMaxHp: mon.maxHp,
    monsterHpRemaining: round2(Math.max(0, mon.maxHp - damageDealt)),
    monsterDefeated,
    overkill: round2(Math.max(0, damageDealt - mon.maxHp)),
    estimatedDps: round2(estimatedDps),
    estimatedTimeToKillSeconds:
      estimatedDps > 0 ? round2(mon.maxHp / estimatedDps) : Number.POSITIVE_INFINITY,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/* -------------------------------------------------------------------------- */
/*  resolveMonsterDefeat                                                       */
/* -------------------------------------------------------------------------- */

export const REWARD_TUNING = {
  BASE_XP: 8,
  XP_PER_LEVEL: 6,
  BASE_GOLD: 5,
  GOLD_PER_LEVEL: 4,

  /** Bônus de XP/ouro por tipo de chefe. */
  BOSS_XP_GOLD_BONUS: {
    none: 1,
    Mini: 5,
    MVP: 15,
    MVP_FINAL: 30,
  } as Readonly<Record<BossFactorKey, number>>,

  /** Chance-base de dropar um fragmento de Selo (antes de raridade/chefe). */
  SEAL_FRAGMENT_BASE_CHANCE: 0.02,
  /** Chance-base de dropar um fragmento de Companheiro. */
  COMPANION_FRAGMENT_BASE_CHANCE: 0.01,

  /** Bônus multiplicativo na chance de drop por tipo de chefe. */
  BOSS_DROP_BONUS: {
    none: 1,
    Mini: 2.5,
    MVP: 5,
    MVP_FINAL: 8,
  } as Readonly<Record<BossFactorKey, number>>,

  /** Fator na chance de drop conforme a raridade do Selo. */
  RARITY_DROP_FACTOR: {
    Comum: 1,
    Incomum: 0.7,
    Raro: 0.45,
    Épico: 0.25,
    Lendário: 0.1,
  } as Readonly<Record<string, number>>,
} as const;

/**
 * Monstros que têm um Companheiro tematicamente associado (GDD seção 7, Tier C).
 * Os demais monstros não dropam fragmento de Companheiro no farm comum.
 */
export const MONSTER_TO_COMPANION: Readonly<Record<string, string>> = {
  coelhal: "coelhal-bebe",
  broteiro: "broteiro-domesticado",
  gotinha: "gotinha-de-estimacao",
};

export interface DefeatRewards {
  monsterId: string;
  xp: number;
  gold: number;
  /** Fragmento do Selo cujo `sourceMonsterId` é este monstro (ou `null`). */
  sealFragment: { sealId: string; dropChance: number } | null;
  /** Fragmento de Companheiro associado ao monstro (ou `null`). */
  companionFragment: { companionId: string; dropChance: number } | null;
  /** Multiplicador global de rebirth aplicado a XP/ouro. */
  rebirthMultiplier: number;
}

/** XP/ouro brutos de um kill (sem rebirth). Compartilhado com `offlineProgress`. */
export function killBaseRewards(monster: Monster): { xp: number; gold: number } {
  const key = bossFactorKey(monster);
  const bonus = REWARD_TUNING.BOSS_XP_GOLD_BONUS[key];
  const level = Math.max(1, monster.level);
  return {
    xp: (REWARD_TUNING.BASE_XP + REWARD_TUNING.XP_PER_LEVEL * level) * bonus,
    gold: (REWARD_TUNING.BASE_GOLD + REWARD_TUNING.GOLD_PER_LEVEL * level) * bonus,
  };
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/**
 * Recompensas ao derrotar um monstro: XP, ouro e chances de drop de fragmento
 * de Selo / Companheiro. Pura — usa `character` apenas para o multiplicador de
 * rebirth. As chances de drop são retornadas como probabilidade (0–1); o
 * sorteio em si é responsabilidade do chamador.
 */
export function resolveMonsterDefeat(
  monster: Monster,
  character: CharacterState,
): DefeatRewards {
  const key = bossFactorKey(monster);
  const rebirthMultiplier = getRebirthMultiplier(character);
  const base = killBaseRewards(monster);

  const seal = BATTLE_SEALS.find((s) => s.sourceMonsterId === monster.id);
  const sealFragment = seal
    ? {
        sealId: seal.id,
        dropChance: clamp01(
          REWARD_TUNING.SEAL_FRAGMENT_BASE_CHANCE *
            REWARD_TUNING.BOSS_DROP_BONUS[key] *
            (REWARD_TUNING.RARITY_DROP_FACTOR[seal.rarity] ?? 1),
        ),
      }
    : null;

  const companionId = MONSTER_TO_COMPANION[monster.id];
  const companionFragment = companionId
    ? {
        companionId,
        dropChance: clamp01(
          REWARD_TUNING.COMPANION_FRAGMENT_BASE_CHANCE *
            REWARD_TUNING.BOSS_DROP_BONUS[key],
        ),
      }
    : null;

  return {
    monsterId: monster.id,
    xp: Math.round(base.xp * rebirthMultiplier),
    gold: Math.round(base.gold * rebirthMultiplier),
    sealFragment,
    companionFragment,
    rebirthMultiplier,
  };
}

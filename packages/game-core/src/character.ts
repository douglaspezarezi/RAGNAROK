/**
 * Personagem: estado bruto e derivação de status de combate.
 *
 * `calculateDerivedStats` é uma função pura que combina:
 *   1. atributos base (FOR/AGI/VIT/INT/DES/SOR)
 *   2. bônus da linha de classe (percorre a cadeia de jobs em `@game/data`)
 *   3. efeitos dos Selos equipados (via `sealEffects.ts`)
 *
 * Todas as fórmulas abaixo são PLACEHOLDER e estão concentradas em
 * `CHARACTER_TUNING` / `CLASS_TUNING` para facilitar o balanceamento depois.
 */

import {
  JOBS_BY_ID,
  type Attribute,
  type JobClass,
  type MonsterElement,
  type MonsterRace,
} from "@game/data";
import {
  getSealMainModifiers,
  type SealModifier,
  type SealStatKey,
} from "./sealEffects";

/* -------------------------------------------------------------------------- */
/*  Estado do personagem                                                       */
/* -------------------------------------------------------------------------- */

export type AttributeBlock = Record<Attribute, number>;

export interface CharacterState {
  /** Nível do personagem (>= 1). */
  level: number;
  /** `id` do job atual (ver `JOBS` em `@game/data`). */
  jobId: string;
  /** Atributos base alocados pelo jogador. */
  baseAttributes: AttributeBlock;
  /** `id`s de Selos equipados (um mesmo Selo conta uma vez só). */
  equippedSeals: string[];
  /** `id` do estágio (= `id` do monstro farmado) em que o personagem está. */
  currentStageId: string;

  /* --- progressão opcional (default sensato quando ausente) --------------- */
  /** Quantos rebirths o personagem já fez. Alimenta o multiplicador global. */
  rebirthCount?: number;
  /** XP acumulado no nível atual. */
  xp?: number;
  /** Números de capítulo já concluídos (gatilho de rebirth, seção 8.3). */
  clearedChapters?: number[];
  /** `id`s de estágios já concluídos. */
  clearedStageIds?: string[];
  /** Companheiros que o jogador possui (preservados no rebirth). */
  ownedCompanionIds?: string[];
  /** Selos que o jogador possui no inventário (preservados no rebirth). */
  ownedSealIds?: string[];
  /** Conquistas desbloqueadas (preservadas no rebirth). */
  unlockedAchievementIds?: string[];
}

/* -------------------------------------------------------------------------- */
/*  Status derivados                                                           */
/* -------------------------------------------------------------------------- */

/** Tabela de modificadores de dano por raça / elemento / "todo elemental". */
export interface DamageModifierTable {
  /** % somado ao multiplicador de dano quando o alvo/origem é desta raça. */
  vsRace: Partial<Record<MonsterRace, number>>;
  /** % somado ao multiplicador de dano quando o alvo/origem é deste elemento. */
  vsElement: Partial<Record<MonsterElement, number>>;
  /** % aplicado a qualquer dano de origem/alvo não-Neutro. */
  allElemental: number;
}

export interface DerivedStats {
  /** Atributos efetivos (base + classe + Selos). */
  attributes: AttributeBlock;

  maxHp: number;
  maxSp: number;
  /** ATQ (dano físico). */
  atk: number;
  /** ATQ.M (dano mágico). */
  matk: number;
  def: number;
  mdef: number;
  /** Chance de crítico, em % (0–100). */
  critChance: number;
  /** Resistência a crítico, em %. */
  critResist: number;
  /** Esquiva (flat). */
  flee: number;
  /** Acerto (flat). */
  hit: number;
  /** Ataques por segundo (> 0). */
  aspd: number;
  /** Chance de bloqueio, em % (0–100). */
  blockChance: number;
  /** Multiplicador de velocidade de movimento (1 = base). */
  moveSpeed: number;
  hpRegenPerSec: number;
  spRegenPerSec: number;

  /** Estilo de ataque efetivo, decidido por INT vs FOR. */
  attackType: "physical" | "magical";
  /** Elemento do ataque do personagem (default Neutro; Selos de "imbuir" mudariam). */
  attackElement: MonsterElement;

  /** Bônus de dano CAUSADO. */
  damageDealt: DamageModifierTable;
  /** Modificador de dano RECEBIDO (valores negativos = redução). */
  damageTaken: DamageModifierTable;
  /** Esquiva extra condicional por raça do atacante. */
  fleeVsRace: Partial<Record<MonsterRace, number>>;

  /** % de dano recebido refletido de volta ao atacante. */
  reflectPercent: number;
  /** % de chance de anular um crítico recebido. */
  negateCritChance: number;
  /** Delta de tempo de conjuração em % (negativo = mais rápido). */
  castTimeDeltaPercent: number;
  /** Multiplicador de cura recebida (1 = base). */
  healingReceivedMultiplier: number;
  /** Percepção (visão de itens raros). */
  perception: number;
  /** Procs de combate herdados dos Selos. */
  procs: { effect: string; chancePercent: number }[];
  /** Imunidades herdadas dos Selos (ex.: "Medo", "Lentidão"). */
  immunities: string[];

  /** `id`s de Selos efetivamente considerados (após dedupe). */
  equippedSealIds: string[];
  /** Todos os modificadores de Selo interpretados (inclui `unparsed`). */
  sealModifiers: SealModifier[];
}

/* -------------------------------------------------------------------------- */
/*  Constantes de fórmula (PLACEHOLDER — balancear depois)                     */
/* -------------------------------------------------------------------------- */

export const ATTRIBUTES: readonly Attribute[] = [
  "FOR",
  "AGI",
  "VIT",
  "INT",
  "DES",
  "SOR",
];

/**
 * Fórmulas base (antes de classe e Selos):
 *   maxHp  = BASE_HP + HP_PER_LEVEL*nível + HP_PER_VIT*VIT
 *   maxSp  = BASE_SP + SP_PER_LEVEL*nível + SP_PER_INT*INT
 *   atk    = ATK_PER_FOR*FOR + ATK_PER_DES*DES + ATK_PER_LEVEL*nível
 *   matk   = MATK_PER_INT*INT + MATK_PER_DES*DES + MATK_PER_LEVEL*nível
 *   def    = DEF_PER_VIT*VIT + DEF_PER_LEVEL*nível
 *   mdef   = MDEF_PER_INT*INT + MDEF_PER_LEVEL*nível
 *   crit   = CRIT_PER_SOR*SOR           (pontos %)
 *   flee   = FLEE_PER_AGI*AGI + FLEE_PER_LEVEL*nível
 *   hit    = HIT_PER_DES*DES + HIT_PER_LEVEL*nível
 *   aspd   = clamp(ASPD_MIN, ASPD_MAX, BASE_ASPD + ASPD_PER_AGI*AGI + ASPD_PER_DES*DES)
 */
export const CHARACTER_TUNING = {
  BASE_HP: 40,
  HP_PER_LEVEL: 12,
  HP_PER_VIT: 15,

  BASE_SP: 20,
  SP_PER_LEVEL: 3,
  SP_PER_INT: 6,

  ATK_PER_FOR: 2,
  ATK_PER_DES: 0.5,
  ATK_PER_LEVEL: 1,

  MATK_PER_INT: 2,
  MATK_PER_DES: 0.3,
  MATK_PER_LEVEL: 1,

  DEF_PER_VIT: 0.7,
  DEF_PER_LEVEL: 0.5,

  MDEF_PER_INT: 0.8,
  MDEF_PER_LEVEL: 0.2,

  CRIT_PER_SOR: 0.3,
  CRIT_RESIST_PER_SOR: 0.2,

  FLEE_PER_AGI: 1,
  FLEE_PER_LEVEL: 1,

  HIT_PER_DES: 1,
  HIT_PER_LEVEL: 1,

  BASE_ASPD: 1.0,
  ASPD_PER_AGI: 0.01,
  ASPD_PER_DES: 0.002,
  ASPD_MIN: 0.2,
  ASPD_MAX: 4.0,

  /**
   * Regen de HP base por segundo, como fração do HP máximo.
   * Elevado de 0.002 → 0.008 para o regen deixar de ser desprezível frente ao
   * dano recebido (era 40–114× o regen na simulação).
   */
  HP_REGEN_FRACTION_PER_SEC: 0.008,
  /** Regen de SP base, plano, por segundo. */
  SP_REGEN_FLAT_PER_SEC: 0.5,
} as const;

/**
 * Contribuição da linha de classe (percorre a cadeia Job 1 -> ... -> job atual):
 *   - cada job com `attributeFocus` soma FOCUS_ATTR_PER_JOB em cada atributo foco
 *   - o multiplicador de potência escala com o maior tier alcançado:
 *       powerMult = 1 + (maiorTier - 1) * POWER_MULT_PER_TIER
 *     (aplicado a HP, ATQ e ATQ.M)
 */
export const CLASS_TUNING = {
  FOCUS_ATTR_PER_JOB: 3,
  POWER_MULT_PER_TIER: 0.08,
} as const;

/* -------------------------------------------------------------------------- */
/*  Helpers internos                                                           */
/* -------------------------------------------------------------------------- */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Cadeia de evolução do job (job atual -> ... -> Job 1). `[]` se id inválido. */
export function jobEvolutionChain(jobId: string): JobClass[] {
  const chain: JobClass[] = [];
  const seen = new Set<string>();
  let current = JOBS_BY_ID.get(jobId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.push(current);
    current = current.previousJobId
      ? JOBS_BY_ID.get(current.previousJobId)
      : undefined;
  }
  return chain;
}

interface ClassContribution {
  focusAttributes: Partial<AttributeBlock>;
  powerMultiplier: number;
}

/** Bônus agregados da linha de classe para um job. Função pura. */
export function computeClassContribution(jobId: string): ClassContribution {
  const chain = jobEvolutionChain(jobId);
  const focusAttributes: Partial<AttributeBlock> = {};
  let maxTier = 1;
  for (const job of chain) {
    if (job.tier > maxTier) maxTier = job.tier;
    for (const attr of job.attributeFocus) {
      focusAttributes[attr] =
        (focusAttributes[attr] ?? 0) + CLASS_TUNING.FOCUS_ATTR_PER_JOB;
    }
  }
  const powerMultiplier =
    chain.length === 0 ? 1 : 1 + (maxTier - 1) * CLASS_TUNING.POWER_MULT_PER_TIER;
  return { focusAttributes, powerMultiplier };
}

/** Acumuladores de modificadores de Selo. */
interface SealAggregate {
  attributeFlat: Partial<Record<Attribute | "ALL", number>>;
  statFlat: Partial<Record<SealStatKey, number>>;
  statPercent: Partial<Record<SealStatKey, number>>;
  damageDealt: DamageModifierTable;
  damageTaken: DamageModifierTable;
  fleeVsRace: Partial<Record<MonsterRace, number>>;
  reflectPercent: number;
  negateCritChance: number;
  procs: { effect: string; chancePercent: number }[];
  immunities: string[];
}

function emptyDamageTable(): DamageModifierTable {
  return { vsRace: {}, vsElement: {}, allElemental: 0 };
}

function addToDamageTable(
  table: DamageModifierTable,
  target:
    | { scope: "race"; race: MonsterRace }
    | { scope: "element"; element: MonsterElement }
    | { scope: "allElemental" },
  percent: number,
): void {
  if (target.scope === "race") {
    table.vsRace[target.race] = (table.vsRace[target.race] ?? 0) + percent;
  } else if (target.scope === "element") {
    table.vsElement[target.element] =
      (table.vsElement[target.element] ?? 0) + percent;
  } else {
    table.allElemental += percent;
  }
}

function aggregateSealModifiers(modifiers: SealModifier[]): SealAggregate {
  const agg: SealAggregate = {
    attributeFlat: {},
    statFlat: {},
    statPercent: {},
    damageDealt: emptyDamageTable(),
    damageTaken: emptyDamageTable(),
    fleeVsRace: {},
    reflectPercent: 0,
    negateCritChance: 0,
    procs: [],
    immunities: [],
  };

  for (const mod of modifiers) {
    switch (mod.kind) {
      case "attribute":
        agg.attributeFlat[mod.attribute] =
          (agg.attributeFlat[mod.attribute] ?? 0) + mod.amount;
        break;
      case "stat": {
        const bucket = mod.isPercent ? agg.statPercent : agg.statFlat;
        bucket[mod.stat] = (bucket[mod.stat] ?? 0) + mod.amount;
        break;
      }
      case "damageDealt":
        addToDamageTable(agg.damageDealt, mod.target, mod.percent);
        break;
      case "damageTaken":
        addToDamageTable(agg.damageTaken, mod.source, mod.percent);
        break;
      case "fleeVsRace":
        agg.fleeVsRace[mod.race] = (agg.fleeVsRace[mod.race] ?? 0) + mod.amount;
        break;
      case "reflect":
        agg.reflectPercent += mod.percent;
        break;
      case "negateCrit":
        agg.negateCritChance += mod.chancePercent;
        break;
      case "proc":
        agg.procs.push({ effect: mod.effect, chancePercent: mod.chancePercent });
        break;
      case "immunity":
        agg.immunities.push(mod.to);
        break;
      case "unparsed":
        break;
    }
  }
  return agg;
}

/* -------------------------------------------------------------------------- */
/*  API pública                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Deriva os status de combate de um personagem. Pura: não muta `character`
 * nem nada em `@game/data`.
 */
export function calculateDerivedStats(character: CharacterState): DerivedStats {
  const level = Math.max(1, Math.floor(character.level));
  const T = CHARACTER_TUNING;

  // ---- 1. atributos efetivos -------------------------------------------
  const classContribution = computeClassContribution(character.jobId);

  const dedupedSealIds = [...new Set(character.equippedSeals)];
  const sealModifiers = dedupedSealIds.flatMap((id) => getSealMainModifiers(id));
  const seal = aggregateSealModifiers(sealModifiers);

  const attributes = {} as AttributeBlock;
  for (const attr of ATTRIBUTES) {
    const base = character.baseAttributes[attr] ?? 0;
    const fromClass = classContribution.focusAttributes[attr] ?? 0;
    const fromSeal = seal.attributeFlat[attr] ?? 0;
    const fromSealAll = seal.attributeFlat.ALL ?? 0;
    attributes[attr] = base + fromClass + fromSeal + fromSealAll;
  }

  // ---- 2. status base a partir dos atributos --------------------------
  const powerMult = classContribution.powerMultiplier;
  const statFlat = seal.statFlat;
  const statPct = seal.statPercent;
  const flat = (k: SealStatKey): number => statFlat[k] ?? 0;
  const pct = (k: SealStatKey): number => statPct[k] ?? 0;

  const baseMaxHp =
    T.BASE_HP + T.HP_PER_LEVEL * level + T.HP_PER_VIT * attributes.VIT;
  const maxHp = Math.round(
    baseMaxHp * powerMult * (1 + pct("maxHp") / 100) + flat("maxHp"),
  );

  const baseMaxSp =
    T.BASE_SP + T.SP_PER_LEVEL * level + T.SP_PER_INT * attributes.INT;
  const maxSp = Math.round(
    baseMaxSp * (1 + pct("maxSp") / 100) + flat("maxSp"),
  );

  const baseAtk =
    T.ATK_PER_FOR * attributes.FOR +
    T.ATK_PER_DES * attributes.DES +
    T.ATK_PER_LEVEL * level;
  const atk = Math.round(
    baseAtk * powerMult * (1 + pct("atk") / 100) + flat("atk"),
  );

  const baseMatk =
    T.MATK_PER_INT * attributes.INT +
    T.MATK_PER_DES * attributes.DES +
    T.MATK_PER_LEVEL * level;
  const matk = Math.round(
    baseMatk * powerMult * (1 + pct("matk") / 100) + flat("matk"),
  );

  const def = Math.round(
    T.DEF_PER_VIT * attributes.VIT + T.DEF_PER_LEVEL * level + flat("def"),
  );
  const mdef = Math.round(
    T.MDEF_PER_INT * attributes.INT + T.MDEF_PER_LEVEL * level,
  );

  const critChance = clamp(
    T.CRIT_PER_SOR * attributes.SOR + flat("critChance") + pct("critChance"),
    0,
    100,
  );
  const critResist = round2(
    T.CRIT_RESIST_PER_SOR * attributes.SOR + flat("critResist"),
  );

  const flee = Math.round(
    T.FLEE_PER_AGI * attributes.AGI + T.FLEE_PER_LEVEL * level + flat("flee"),
  );
  const hit = Math.round(
    T.HIT_PER_DES * attributes.DES + T.HIT_PER_LEVEL * level + flat("hit"),
  );

  const baseAspd =
    T.BASE_ASPD +
    T.ASPD_PER_AGI * attributes.AGI +
    T.ASPD_PER_DES * attributes.DES;
  const aspd = round2(
    clamp(baseAspd * (1 + pct("aspdPercent") / 100), T.ASPD_MIN, T.ASPD_MAX),
  );

  const blockChance = clamp(flat("block") + pct("block"), 0, 100);
  const moveSpeed = round2(1 + pct("moveSpeedPercent") / 100);

  const hpRegenPerSec = round2(
    maxHp * T.HP_REGEN_FRACTION_PER_SEC +
      (maxHp * (pct("hpRegenPct10s") / 100)) / 10,
  );
  const spRegenPerSec = round2(T.SP_REGEN_FLAT_PER_SEC + flat("spRegen"));

  // ---- 3. metadados de combate --------------------------------------
  const attackType: DerivedStats["attackType"] =
    attributes.INT > attributes.FOR ? "magical" : "physical";

  return {
    attributes,
    maxHp,
    maxSp,
    atk,
    matk,
    def,
    mdef,
    critChance: round2(critChance),
    critResist,
    flee,
    hit,
    aspd,
    blockChance: round2(blockChance),
    moveSpeed,
    hpRegenPerSec,
    spRegenPerSec,
    attackType,
    attackElement: "Neutro",
    damageDealt: seal.damageDealt,
    damageTaken: seal.damageTaken,
    fleeVsRace: seal.fleeVsRace,
    reflectPercent: seal.reflectPercent,
    negateCritChance: seal.negateCritChance,
    castTimeDeltaPercent:
      (statPct.castTimeDeltaPercent ?? 0) + (statFlat.castTimeDeltaPercent ?? 0),
    healingReceivedMultiplier: round2(
      1 + (statPct.healingReceivedPercent ?? 0) / 100,
    ),
    perception: flat("perception"),
    procs: seal.procs,
    immunities: seal.immunities,
    equippedSealIds: dedupedSealIds,
    sealModifiers,
  };
}

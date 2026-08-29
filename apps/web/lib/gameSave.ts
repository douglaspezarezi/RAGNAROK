/**
 * Forma do save e regras puras de progressão (nível/XP/ouro/estágio).
 *
 * Sem React, sem Supabase, sem localStorage — só transformação de dados.
 * A lógica de combate/recompensa continua vindo de `@game/core`; aqui só
 * aplicamos os ganhos ao `GameSave` (curva de XP, ganho de atributo por nível,
 * avanço de estágio).
 */

import { BASE_JOBS, MONSTERS, type Monster } from "@game/data";
import {
  applyRebirth,
  canRebirth,
  getMonstersByChapter,
  type BannerType,
  type CharacterState,
  type DefeatRewards,
  type OfflineRewardsSummary,
  type SummonResult,
} from "@game/core";

export const SAVE_VERSION = 1;

/** Banners de invocação (chave em `summonPity`). */
export type SummonBanner = BannerType;

export interface GameSave {
  version: number;
  character: CharacterState;
  gold: number;
  /** sealId -> fragmentos/essência acumulados (a existência da chave = "possui o Selo") */
  sealFragments: Record<string, number>;
  /** companionId -> fragmentos acumulados (a existência da chave = "possui o Companheiro") */
  companionFragments: Record<string, number>;
  /** slot de equipamento (EquipmentSlot) -> id do Selo equipado */
  equippedSeals: Record<string, string>;
  /** saldo de Cristal de Invocação */
  summonCrystals: number;
  /** contador de pity por banner */
  summonPity: Record<SummonBanner, number>;
}

/** Saldo inicial de Cristal de Invocação (placeholder — sem fonte de renda ainda). */
export const INITIAL_SUMMON_CRYSTALS = 1000;

/** Custo em Cristais por invocação. */
export const SUMMON_COST = { single: 100, ten: 900 } as const;

/* -------------------------------------------------------------------------- */
/*  Estado inicial (mesma lógica de antes, agora reaproveitada no onboarding)  */
/* -------------------------------------------------------------------------- */

/** Primeira classe disponível (Job 1 da primeira linha). */
export const STARTER_JOB_ID = BASE_JOBS[0]?.id ?? "recruta";

/** Alocação inicial de atributos — simétrica, só para dar jogabilidade ao nível 1. */
export const STARTER_ATTRIBUTES = {
  FOR: 8,
  AGI: 8,
  VIT: 8,
  INT: 8,
  DES: 8,
  SOR: 8,
} as const;

/**
 * Monstros "de farm" de um capítulo: os comuns, sem os chefes (Mini/MVP).
 * O capítulo é "limpo" quando o último monstro comum cai.
 */
export function getStageMonsters(chapterNumber: number): Monster[] {
  return getMonstersByChapter(chapterNumber).filter((m) => !m.isBoss);
}

/** Primeiro estágio = primeiro monstro comum do Capítulo 1. */
export function firstStageId(): string {
  return getStageMonsters(1)[0]?.id ?? MONSTERS[0].id;
}

export function createInitialCharacter(): CharacterState {
  return {
    level: 1,
    jobId: STARTER_JOB_ID,
    baseAttributes: { ...STARTER_ATTRIBUTES },
    equippedSeals: [],
    currentStageId: firstStageId(),
    xp: 0,
    rebirthCount: 0,
    clearedChapters: [],
    clearedStageIds: [],
  };
}

export function createInitialSave(): GameSave {
  return {
    version: SAVE_VERSION,
    character: createInitialCharacter(),
    gold: 0,
    sealFragments: {},
    companionFragments: {},
    equippedSeals: {},
    summonCrystals: INITIAL_SUMMON_CRYSTALS,
    summonPity: { companion: 0, seal: 0 },
  };
}

/* -------------------------------------------------------------------------- */
/*  Curva de XP / ganho por nível (placeholder — a balancear)                  */
/* -------------------------------------------------------------------------- */

/** XP necessário para sair de `level` para `level + 1`. */
export function xpToNextLevel(level: number): number {
  return Math.floor(50 + 25 * level + 5 * level * level);
}

/**
 * Ganho automático de atributos por nível (placeholder do protótipo — enquanto
 * não há alocação manual de pontos).
 */
export const LEVEL_UP_ATTRIBUTE_GROWTH = 5;

/**
 * Aplica ganho de XP e ouro: sobe de nível quantas vezes for necessário e,
 * a cada nível, concede +LEVEL_UP_ATTRIBUTE_GROWTH em todos os atributos.
 * Não muta `save`.
 */
export function applyXpAndGold(
  save: GameSave,
  xpGain: number,
  goldGain: number,
): { save: GameSave; levelsGained: number } {
  const char = save.character;
  let level = char.level;
  let xp = (char.xp ?? 0) + Math.max(0, xpGain);
  let levelsGained = 0;
  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
    levelsGained += 1;
  }

  let baseAttributes = char.baseAttributes;
  if (levelsGained > 0) {
    const g = LEVEL_UP_ATTRIBUTE_GROWTH * levelsGained;
    baseAttributes = {
      FOR: char.baseAttributes.FOR + g,
      AGI: char.baseAttributes.AGI + g,
      VIT: char.baseAttributes.VIT + g,
      INT: char.baseAttributes.INT + g,
      DES: char.baseAttributes.DES + g,
      SOR: char.baseAttributes.SOR + g,
    };
  }

  return {
    save: {
      ...save,
      character: { ...char, level, xp, baseAttributes },
      gold: save.gold + Math.max(0, goldGain),
    },
    levelsGained,
  };
}

/** Soma `n` fragmentos a um id num mapa, sem mutar o original. */
function addFragments(
  map: Record<string, number>,
  id: string,
  n: number,
): Record<string, number> {
  if (n <= 0) return map;
  return { ...map, [id]: (map[id] ?? 0) + n };
}

export interface ApplyKillInput {
  monster: Monster;
  rewards: DefeatRewards;
  sealDropped: boolean;
  companionDropped: boolean;
}

/**
 * Aplica o resultado de um monstro derrotado ao save: XP/ouro/nível, fragmentos,
 * marca o estágio/capítulo como limpo e avança para o próximo monstro comum
 * (voltando ao início do capítulo quando o último cai). Não muta `save`.
 */
export function applyKill(
  save: GameSave,
  input: ApplyKillInput,
): { save: GameSave; levelsGained: number; chapterCleared: boolean } {
  const { monster, rewards, sealDropped, companionDropped } = input;
  const { save: withXp, levelsGained } = applyXpAndGold(
    save,
    rewards.xp,
    rewards.gold,
  );

  let sealFragments = withXp.sealFragments;
  if (sealDropped && rewards.sealFragment) {
    sealFragments = addFragments(sealFragments, rewards.sealFragment.sealId, 1);
  }
  let companionFragments = withXp.companionFragments;
  if (companionDropped && rewards.companionFragment) {
    companionFragments = addFragments(
      companionFragments,
      rewards.companionFragment.companionId,
      1,
    );
  }

  const char = withXp.character;
  const clearedStageIds = (char.clearedStageIds ?? []).includes(monster.id)
    ? char.clearedStageIds ?? []
    : [...(char.clearedStageIds ?? []), monster.id];

  const chapterMonsters = getStageMonsters(monster.chapterNumber);
  const idx = chapterMonsters.findIndex((m) => m.id === monster.id);
  const nextMonster = idx >= 0 ? chapterMonsters[idx + 1] : undefined;

  let clearedChapters = char.clearedChapters ?? [];
  let currentStageId: string;
  let chapterCleared = false;
  if (nextMonster) {
    currentStageId = nextMonster.id;
  } else {
    if (!clearedChapters.includes(monster.chapterNumber)) {
      clearedChapters = [...clearedChapters, monster.chapterNumber];
      chapterCleared = true;
    }
    currentStageId = chapterMonsters[0]?.id ?? monster.id;
  }

  return {
    save: {
      ...withXp,
      character: {
        ...char,
        currentStageId,
        clearedStageIds,
        clearedChapters,
      },
      sealFragments,
      companionFragments,
    },
    levelsGained,
    chapterCleared,
  };
}

/** Avança para o 1º monstro do próximo capítulo, se o atual estiver limpo. */
export function applyAdvanceStage(
  save: GameSave,
  fromChapter: number,
): { save: GameSave; ok: boolean; toChapter?: number } {
  const char = save.character;
  if (!(char.clearedChapters ?? []).includes(fromChapter)) {
    return { save, ok: false };
  }
  const next = getStageMonsters(fromChapter + 1)[0];
  if (!next) return { save, ok: false };
  return {
    save: { ...save, character: { ...char, currentStageId: next.id } },
    ok: true,
    toChapter: fromChapter + 1,
  };
}

/* -------------------------------------------------------------------------- */
/*  Equipar Selos                                                              */
/* -------------------------------------------------------------------------- */

/** Mantém `character.equippedSeals` (array, usado por `calculateDerivedStats`)
 *  em sincronia com o mapa por slot. */
function withEquippedInSync(
  save: GameSave,
  equipped: Record<string, string>,
): GameSave {
  return {
    ...save,
    equippedSeals: equipped,
    character: { ...save.character, equippedSeals: Object.values(equipped) },
  };
}

/** Equipa `sealId` no `slot` (um Selo por slot; remove o mesmo Selo de outro slot). */
export function applyEquip(
  save: GameSave,
  slot: string,
  sealId: string,
): GameSave {
  const equipped: Record<string, string> = {};
  for (const [s, id] of Object.entries(save.equippedSeals)) {
    if (id !== sealId) equipped[s] = id; // tira o Selo de onde estivesse
  }
  equipped[slot] = sealId;
  return withEquippedInSync(save, equipped);
}

/** Desequipa o Selo do `slot`. */
export function applyUnequip(save: GameSave, slot: string): GameSave {
  if (!save.equippedSeals[slot]) return save;
  const equipped = { ...save.equippedSeals };
  delete equipped[slot];
  return withEquippedInSync(save, equipped);
}

/* -------------------------------------------------------------------------- */
/*  Invocação (gacha)                                                          */
/* -------------------------------------------------------------------------- */

export interface ApplySummonInput {
  crystalCost: number;
  /** pity final após a leva (vem do último `SummonResult.pityCounterAfter`). */
  finalPity: number;
  results: SummonResult[];
}

/**
 * Aplica uma leva de invocações ao save: debita Cristais, grava o pity final e
 * concede posse (novo) ou fragmentos/Essência (duplicata). Não muta `save`.
 */
export function applySummonResults(
  save: GameSave,
  banner: SummonBanner,
  { crystalCost, finalPity, results }: ApplySummonInput,
): GameSave {
  const map = {
    ...(banner === "companion" ? save.companionFragments : save.sealFragments),
  };
  for (const r of results) {
    if (r.outcome === "new") {
      map[r.itemId] = map[r.itemId] ?? 0; // garante a linha de posse
    } else {
      map[r.itemId] = (map[r.itemId] ?? 0) + r.fragmentsAwarded;
    }
  }
  return {
    ...save,
    summonCrystals: Math.max(0, save.summonCrystals - crystalCost),
    summonPity: { ...save.summonPity, [banner]: finalPity },
    ...(banner === "companion"
      ? { companionFragments: map }
      : { sealFragments: map }),
  };
}

/* -------------------------------------------------------------------------- */
/*  Rebirth                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Aplica `applyRebirth` de `@game/core` ao personagem, preservando o resto do
 * save (Selos equipados, Cristais, pity, fragmentos). Não muta `save`.
 */
export function applyRebirthToSave(save: GameSave): {
  ok: boolean;
  save: GameSave;
  error?: string;
} {
  if (!canRebirth(save.character)) {
    return {
      ok: false,
      save,
      error: "O personagem ainda não atende ao gatilho de renascimento.",
    };
  }
  try {
    return { ok: true, save: { ...save, character: applyRebirth(save.character) } };
  } catch (e) {
    return {
      ok: false,
      save,
      error: e instanceof Error ? e.message : "Erro ao renascer.",
    };
  }
}

/** Aplica o resumo de progresso offline (`@game/core`) ao save. Não muta. */
export function applyOfflineRewards(
  save: GameSave,
  summary: OfflineRewardsSummary,
): { save: GameSave; levelsGained: number } {
  const { save: withXp, levelsGained } = applyXpAndGold(
    save,
    summary.xp,
    summary.gold,
  );
  let sealFragments = withXp.sealFragments;
  if (summary.sealFragments && summary.sealFragments.amount > 0) {
    sealFragments = addFragments(
      sealFragments,
      summary.sealFragments.sealId,
      summary.sealFragments.amount,
    );
  }
  let companionFragments = withXp.companionFragments;
  if (summary.companionFragments && summary.companionFragments.amount > 0) {
    companionFragments = addFragments(
      companionFragments,
      summary.companionFragments.companionId,
      summary.companionFragments.amount,
    );
  }
  return {
    save: { ...withXp, sealFragments, companionFragments },
    levelsGained,
  };
}

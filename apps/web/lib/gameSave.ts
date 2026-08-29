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
  getMonstersByChapter,
  type CharacterState,
  type DefeatRewards,
  type OfflineRewardsSummary,
} from "@game/core";

export const SAVE_VERSION = 1;

export interface GameSave {
  version: number;
  character: CharacterState;
  gold: number;
  /** sealId -> quantidade de fragmentos */
  sealFragments: Record<string, number>;
  /** companionId -> quantidade de fragmentos */
  companionFragments: Record<string, number>;
}

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

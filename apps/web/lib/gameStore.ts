"use client";

/**
 * Store local do personagem (protótipo, sem contas/Supabase).
 *
 * - Guarda `CharacterState` (de `@game/core`) + ouro + fragmentos num único
 *   objeto `GameSave`, persistido em `localStorage` a cada mudança.
 * - Expõe `useGameSave()` (via `useSyncExternalStore`) para os componentes lerem,
 *   e ações puras-ish (`recordKill`, `advanceStage`, `resetSave`) para mutarem.
 *
 * A lógica de combate/recompensa NÃO vive aqui — vem de `@game/core`.
 */

import { useSyncExternalStore } from "react";

import {
  BASE_JOBS,
  MONSTERS,
  MONSTERS_BY_ID,
  type Monster,
} from "@game/data";
import {
  getMonstersByChapter,
  type CharacterState,
  type DefeatRewards,
} from "@game/core";

const STORAGE_KEY = "ragnarok:save";
const SAVE_VERSION = 1;

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
/*  Estado inicial                                                             */
/* -------------------------------------------------------------------------- */

/** Primeira classe disponível (Job 1 da primeira linha). */
const STARTER_JOB_ID = BASE_JOBS[0]?.id ?? "recruta";

/** Alocação inicial de atributos — simétrica, só para dar jogabilidade ao nível 1. */
const STARTER_ATTRIBUTES = {
  FOR: 8,
  AGI: 8,
  VIT: 8,
  INT: 8,
  DES: 8,
  SOR: 8,
} as const;

/** Primeiro estágio = primeiro monstro comum do Capítulo 1. */
function firstStageId(): string {
  return getStageMonsters(1)[0]?.id ?? MONSTERS[0].id;
}

export function createInitialSave(): GameSave {
  return {
    version: SAVE_VERSION,
    character: {
      level: 1,
      jobId: STARTER_JOB_ID,
      baseAttributes: { ...STARTER_ATTRIBUTES },
      equippedSeals: [],
      currentStageId: firstStageId(),
      xp: 0,
      rebirthCount: 0,
      clearedChapters: [],
      clearedStageIds: [],
    },
    gold: 0,
    sealFragments: {},
    companionFragments: {},
  };
}

/* -------------------------------------------------------------------------- */
/*  Curva de XP (placeholder — a balancear)                                    */
/* -------------------------------------------------------------------------- */

/** XP necessário para sair de `level` para `level + 1`. */
export function xpToNextLevel(level: number): number {
  return Math.floor(50 + 25 * level + 5 * level * level);
}

/**
 * Ganho automático de atributos por nível (placeholder do protótipo).
 *
 * O jogo final terá alocação manual de pontos; enquanto isso não existe, cada
 * nível concede +N em todos os atributos, para o personagem acompanhar a curva
 * de dificuldade dos monstros e o loop não travar.
 */
export const LEVEL_UP_ATTRIBUTE_GROWTH = 5;

/**
 * Monstros "de farm" de um capítulo: os comuns, sem os chefes (Mini/MVP).
 * As lutas de chefe terão UI própria depois; por ora ficam fora da rotação e o
 * capítulo é considerado "limpo" quando o último monstro comum cai.
 */
export function getStageMonsters(chapterNumber: number): Monster[] {
  return getMonstersByChapter(chapterNumber).filter((m) => !m.isBoss);
}

/* -------------------------------------------------------------------------- */
/*  Store (external store para useSyncExternalStore)                           */
/* -------------------------------------------------------------------------- */

let SERVER_SNAPSHOT: GameSave | null = null;
function getServerSnapshot(): GameSave {
  SERVER_SNAPSHOT ??= createInitialSave();
  return SERVER_SNAPSHOT;
}

let clientState: GameSave | null = null;
const listeners = new Set<() => void>();

function isValidSave(value: unknown): value is GameSave {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<GameSave>;
  return (
    v.version === SAVE_VERSION &&
    typeof v.character === "object" &&
    v.character !== null &&
    typeof v.character.currentStageId === "string"
  );
}

function loadFromStorage(): GameSave | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidSave(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clientState));
  } catch {
    /* quota cheia / modo privado — ignora, o jogo segue em memória */
  }
}

function getSnapshot(): GameSave {
  if (typeof window === "undefined") return getServerSnapshot();
  if (clientState === null) {
    clientState = loadFromStorage() ?? createInitialSave();
  }
  return clientState;
}

function commit(next: GameSave): void {
  clientState = next;
  persist();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Hook de leitura reativa do save. */
export function useGameSave(): GameSave {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Leitura imperativa (para usar dentro do loop de combate). */
export function getSave(): GameSave {
  return getSnapshot();
}

/* -------------------------------------------------------------------------- */
/*  Ações                                                                      */
/* -------------------------------------------------------------------------- */

/** Apaga o progresso salvo e recomeça do zero. */
export function resetSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignora */
  }
  commit(createInitialSave());
}

export interface RecordKillInput {
  monster: Monster;
  rewards: DefeatRewards;
  /** resultado do sorteio de drop de fragmento de Selo (feito pelo chamador). */
  sealDropped: boolean;
  /** resultado do sorteio de drop de fragmento de Companheiro. */
  companionDropped: boolean;
}

/**
 * Aplica XP/ouro/loot de um monstro derrotado, sobe de nível se necessário,
 * marca o estágio/capítulo como limpo e avança para o próximo monstro do
 * capítulo (voltando ao início do capítulo quando o último cai).
 */
export function recordKill(input: RecordKillInput): {
  levelsGained: number;
  chapterCleared: boolean;
} {
  const { monster, rewards, sealDropped, companionDropped } = input;
  const prev = getSnapshot();
  const char = prev.character;

  // --- XP e nível ---
  let level = char.level;
  let xp = (char.xp ?? 0) + rewards.xp;
  let levelsGained = 0;
  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
    levelsGained += 1;
  }

  // ganho automático de atributos por nível (placeholder — ver constante)
  let baseAttributes = char.baseAttributes;
  if (levelsGained > 0) {
    const growth = LEVEL_UP_ATTRIBUTE_GROWTH * levelsGained;
    baseAttributes = {
      FOR: char.baseAttributes.FOR + growth,
      AGI: char.baseAttributes.AGI + growth,
      VIT: char.baseAttributes.VIT + growth,
      INT: char.baseAttributes.INT + growth,
      DES: char.baseAttributes.DES + growth,
      SOR: char.baseAttributes.SOR + growth,
    };
  }

  // --- fragmentos ---
  const sealFragments = { ...prev.sealFragments };
  if (sealDropped && rewards.sealFragment) {
    const id = rewards.sealFragment.sealId;
    sealFragments[id] = (sealFragments[id] ?? 0) + 1;
  }
  const companionFragments = { ...prev.companionFragments };
  if (companionDropped && rewards.companionFragment) {
    const id = rewards.companionFragment.companionId;
    companionFragments[id] = (companionFragments[id] ?? 0) + 1;
  }

  // --- progresso de estágio ---
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
    // último monstro do capítulo caiu -> capítulo limpo, recomeça o farm do capítulo
    if (!clearedChapters.includes(monster.chapterNumber)) {
      clearedChapters = [...clearedChapters, monster.chapterNumber];
      chapterCleared = true;
    }
    currentStageId = chapterMonsters[0]?.id ?? monster.id;
  }

  commit({
    ...prev,
    character: {
      ...char,
      level,
      xp,
      baseAttributes,
      currentStageId,
      clearedStageIds,
      clearedChapters,
    },
    gold: prev.gold + rewards.gold,
    sealFragments,
    companionFragments,
  });

  return { levelsGained, chapterCleared };
}

/**
 * Avança para o primeiro monstro do próximo capítulo.
 * Só funciona se o capítulo atual já estiver marcado como limpo e existir um
 * próximo capítulo no bestiário.
 */
export function advanceStage(): { ok: boolean; toChapter?: number } {
  const prev = getSnapshot();
  const char = prev.character;
  const current = MONSTERS_BY_ID.get(char.currentStageId);
  if (!current) return { ok: false };

  const chapter = current.chapterNumber;
  if (!(char.clearedChapters ?? []).includes(chapter)) return { ok: false };

  const nextMonsters = getStageMonsters(chapter + 1);
  const first = nextMonsters[0];
  if (!first) return { ok: false };

  commit({
    ...prev,
    character: { ...char, currentStageId: first.id },
  });
  return { ok: true, toChapter: chapter + 1 };
}

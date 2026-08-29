/**
 * Rebirth / Prestígio (GDD seção 8.3).
 *
 * - `canRebirth`      — checa o gatilho mínimo (nível OU capítulo concluído).
 * - `applyRebirth`    — reseta nível/estágio, preserva coleções, incrementa o
 *                       contador de rebirths.
 * - `getRebirthMultiplier` — multiplicador global (dano/XP/ouro) que cresce a
 *                       cada rebirth; consumido por `combat.ts` e `offlineProgress.ts`.
 *
 * Todas as funções são puras (não mutam `character`).
 */

import type { CharacterState } from "./character";

/** Nível mínimo para rebirth (GDD: "ex.: nível 100"). */
export const REBIRTH_MIN_LEVEL = 100;

/** Capítulo que, uma vez concluído, também libera o rebirth (GDD: "Capítulo 8 concluído"). */
export const REBIRTH_MIN_CLEARED_CHAPTER = 8;

/** Ganho do multiplicador global permanente por rebirth (GDD: "ex.: +5%"). */
export const REBIRTH_GLOBAL_BONUS_PER_REBIRTH = 0.05;

/** Nível para o qual o personagem volta após o rebirth. */
export const REBIRTH_RESET_LEVEL = 1;

/** Estágio inicial após o rebirth (primeiro monstro do Capítulo 1). */
export const REBIRTH_STARTING_STAGE_ID = "gotinha";

/** Contador de rebirths normalizado (>= 0, inteiro). */
export function getRebirthCount(character: CharacterState): number {
  return Math.max(0, Math.floor(character.rebirthCount ?? 0));
}

/**
 * Multiplicador global permanente: `1 + rebirths * REBIRTH_GLOBAL_BONUS_PER_REBIRTH`.
 * 0 rebirths -> 1.0; 3 rebirths -> 1.15.
 */
export function getRebirthMultiplier(character: CharacterState): number {
  return 1 + getRebirthCount(character) * REBIRTH_GLOBAL_BONUS_PER_REBIRTH;
}

/** `true` se o personagem atende ao gatilho de rebirth (nível OU capítulo). */
export function canRebirth(character: CharacterState): boolean {
  const byLevel = character.level >= REBIRTH_MIN_LEVEL;
  const byChapter = (character.clearedChapters ?? []).some(
    (chapter) => chapter >= REBIRTH_MIN_CLEARED_CHAPTER,
  );
  return byLevel || byChapter;
}

/**
 * Aplica o rebirth e devolve um NOVO estado.
 *
 * Reseta: nível, XP, estágio atual, progresso de capítulos/estágios.
 * Preserva: job, atributos base, Selos equipados, companheiros/Selos possuídos,
 * conquistas.
 * Incrementa: `rebirthCount`.
 *
 * Lança `Error` se `canRebirth(character)` for `false`.
 */
export function applyRebirth(character: CharacterState): CharacterState {
  if (!canRebirth(character)) {
    throw new Error(
      `applyRebirth: gatilho não atingido (requer nível >= ${REBIRTH_MIN_LEVEL} ` +
        `ou capítulo >= ${REBIRTH_MIN_CLEARED_CHAPTER} concluído).`,
    );
  }

  return {
    ...character,
    level: REBIRTH_RESET_LEVEL,
    xp: 0,
    currentStageId: REBIRTH_STARTING_STAGE_ID,
    clearedChapters: [],
    clearedStageIds: [],
    rebirthCount: getRebirthCount(character) + 1,
    // cópias defensivas do que é preservado (evita aliasing com a entrada)
    baseAttributes: { ...character.baseAttributes },
    equippedSeals: [...character.equippedSeals],
    ownedCompanionIds: character.ownedCompanionIds
      ? [...character.ownedCompanionIds]
      : undefined,
    ownedSealIds: character.ownedSealIds
      ? [...character.ownedSealIds]
      : undefined,
    unlockedAchievementIds: character.unlockedAchievementIds
      ? [...character.unlockedAchievementIds]
      : undefined,
  };
}

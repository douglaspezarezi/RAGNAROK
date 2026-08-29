"use client";

/**
 * Conquistas — avaliação e desbloqueio.
 *
 * O catálogo (`achievements`) e o que o jogador já tem (`player_achievements`)
 * são hidratados no login. `runAchievementCheck` é chamado pelo `gameStore` nos
 * momentos que já existem (derrota de monstro, level up, invocação, rebirth,
 * equipar Selo, vitória no Chefe da Semana, recompensa de evento) — sem polling.
 *
 * Não importa `gameStore` (evita ciclo): quem chama passa o `save`, o `playerId`
 * e callbacks para conceder recompensa / persistir.
 */

import { useSyncExternalStore } from "react";

import { COMPANIONS_BY_ID } from "@game/data";

import type { GameSave } from "./gameSave";
import { insertPlayerAchievement } from "./persistence";
import { notify } from "./toast";
import type { AchievementRow } from "./supabase/types";

export type AchievementDef = AchievementRow;

/* -------------------------------------------------------------------------- */
/*  Store de módulo                                                            */
/* -------------------------------------------------------------------------- */

interface AchState {
  defs: AchievementDef[];
  unlocked: ReadonlySet<string>;
}

let state: AchState = { defs: [], unlocked: new Set() };
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function hydrateAchievements(
  defs: AchievementDef[],
  unlockedIds: string[],
): void {
  state = {
    defs: [...defs].sort((a, b) => a.sort_order - b.sort_order),
    unlocked: new Set(unlockedIds),
  };
  emit();
}

export function clearAchievements(): void {
  state = { defs: [], unlocked: new Set() };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const SERVER: AchState = { defs: [], unlocked: new Set() };

export function useAchievements(): AchState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER,
  );
}

/* -------------------------------------------------------------------------- */
/*  Avaliação de critérios                                                     */
/* -------------------------------------------------------------------------- */

export interface AchievementSnapshot {
  level: number;
  totalKills: number;
  chaptersCleared: number;
  rebirthCount: number;
  ownedCompanions: number;
  ownedSeals: number;
  equippedSlots: number;
  hasTierSCompanion: boolean;
  weeklyBossWins: number;
  eventRewardsClaimed: number;
}

/** Extrai do `GameSave` tudo que os critérios de conquista precisam. */
export function achievementSnapshot(save: GameSave): AchievementSnapshot {
  const companionIds = Object.keys(save.companionFragments);
  return {
    level: save.character.level,
    totalKills: save.totalKills ?? 0,
    chaptersCleared: (save.character.clearedChapters ?? []).length,
    rebirthCount: save.character.rebirthCount ?? 0,
    ownedCompanions: companionIds.length,
    ownedSeals: Object.keys(save.sealFragments).length,
    equippedSlots: Object.keys(save.equippedSeals).length,
    hasTierSCompanion: companionIds.some(
      (id) => COMPANIONS_BY_ID.get(id)?.tier === "S",
    ),
    weeklyBossWins: save.milestones?.weeklyBossWins ?? 0,
    eventRewardsClaimed: save.milestones?.eventRewardsClaimed ?? 0,
  };
}

/** Valor atual do jogador para o critério de uma conquista. */
export function criteriaCurrent(
  type: AchievementDef["criteria_type"],
  s: AchievementSnapshot,
): number {
  switch (type) {
    case "reach_level":
      return s.level;
    case "total_kills":
      return s.totalKills;
    case "clear_chapters":
      return s.chaptersCleared;
    case "own_companion_tier_s":
      return s.hasTierSCompanion ? 1 : 0;
    case "own_companions":
      return s.ownedCompanions;
    case "equip_all_seal_slots":
      return s.equippedSlots;
    case "own_seals":
      return s.ownedSeals;
    case "first_rebirth":
      return s.rebirthCount >= 1 ? 1 : 0;
    case "reach_rebirth":
      return s.rebirthCount;
    case "weekly_boss_win":
      return s.weeklyBossWins;
    case "claim_event_reward":
      return s.eventRewardsClaimed;
    default:
      return 0;
  }
}

export interface AchievementProgress {
  current: number;
  target: number;
  unlocked: boolean;
  /** Critério atingido (mesmo que o registro ainda não tenha sincronizado). */
  complete: boolean;
  /** `true` quando faz sentido mostrar "X/Y" (critério numérico > 1). */
  showBar: boolean;
}

export function achievementProgress(
  def: AchievementDef,
  save: GameSave,
  unlocked: ReadonlySet<string>,
): AchievementProgress {
  const current = criteriaCurrent(def.criteria_type, achievementSnapshot(save));
  const target = Math.max(1, def.criteria_value);
  return {
    current,
    target,
    unlocked: unlocked.has(def.id),
    complete: current >= target,
    showBar: target > 1,
  };
}

/* -------------------------------------------------------------------------- */
/*  Desbloqueio                                                                */
/* -------------------------------------------------------------------------- */

export interface RunCheckArgs {
  playerId: string;
  save: GameSave;
  /** Concede a recompensa da conquista (Companheiro/Selo) ao save em memória. */
  grantReward: (kind: "companion" | "seal", id: string) => void;
  /** Persiste o save depois de conceder recompensa(s). */
  persist: () => Promise<void>;
}

/**
 * Verifica todas as conquistas contra o estado atual. Para cada uma recém
 * satisfeita: marca localmente, dispara notificação, concede recompensa e grava
 * a linha em `player_achievements`. Idempotente por conquista.
 */
export async function runAchievementCheck({
  playerId,
  save,
  grantReward,
  persist,
}: RunCheckArgs): Promise<void> {
  if (state.defs.length === 0) return;

  const snap = achievementSnapshot(save);
  const newlyUnlocked: AchievementDef[] = [];

  for (const def of state.defs) {
    if (state.unlocked.has(def.id)) continue;
    if (criteriaCurrent(def.criteria_type, snap) >= Math.max(1, def.criteria_value)) {
      newlyUnlocked.push(def);
    }
  }
  if (newlyUnlocked.length === 0) return;

  // marca localmente já (evita re-notificar nos próximos ticks)
  const nextUnlocked = new Set(state.unlocked);
  for (const def of newlyUnlocked) nextUnlocked.add(def.id);
  state = { ...state, unlocked: nextUnlocked };
  emit();

  let grantedAny = false;
  for (const def of newlyUnlocked) {
    notify("achievement", `Conquista desbloqueada: ${def.name}`);
    if (def.reward_type && def.reward_id) {
      grantReward(def.reward_type, def.reward_id);
      grantedAny = true;
    }
    void insertPlayerAchievement(playerId, def.id).then((ok) => {
      if (!ok) {
        notify(
          "error",
          `"${def.name}" desbloqueada, mas não registrada — tentaremos no próximo login.`,
        );
      }
    });
  }

  if (grantedAny) await persist();
}

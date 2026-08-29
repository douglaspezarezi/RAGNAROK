"use client";

/**
 * Preferências do jogador (som, música, velocidade de combate).
 *
 * Store de módulo no mesmo padrão de `toast`/`gameStore` (`useSyncExternalStore`).
 * Hidratado a partir de `players.settings` no login (via `gameStore.hydrate`) e
 * persistido a cada alteração. Sem áudio ainda — os toggles ficam prontos.
 */

import { useSyncExternalStore } from "react";

import { savePlayerSettings } from "./persistence";
import type { PlayerSettings } from "./supabase/types";

export type { PlayerSettings } from "./supabase/types";

export const DEFAULT_SETTINGS: PlayerSettings = {
  sound: true,
  music: true,
  combatSpeed: "normal",
};

/** Intervalo do loop de combate por velocidade escolhida. */
export const COMBAT_TICK_MS: Record<PlayerSettings["combatSpeed"], number> = {
  normal: 1000,
  fast: 500,
};

let current: PlayerSettings = { ...DEFAULT_SETTINGS };
let playerId: string | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function normalize(raw: Partial<PlayerSettings> | null | undefined): PlayerSettings {
  return {
    sound: typeof raw?.sound === "boolean" ? raw.sound : DEFAULT_SETTINGS.sound,
    music: typeof raw?.music === "boolean" ? raw.music : DEFAULT_SETTINGS.music,
    combatSpeed:
      raw?.combatSpeed === "fast" || raw?.combatSpeed === "normal"
        ? raw.combatSpeed
        : DEFAULT_SETTINGS.combatSpeed,
  };
}

/** Chamado pelo `gameStore.hydrate` no login. */
export function hydrateSettings(
  pid: string,
  raw: Partial<PlayerSettings> | null | undefined,
): void {
  playerId = pid;
  current = normalize(raw);
  emit();
}

export function clearSettings(): void {
  playerId = null;
  current = { ...DEFAULT_SETTINGS };
  emit();
}

export function getSettings(): PlayerSettings {
  return current;
}

/** Atualiza uma preferência (otimista) e persiste em `players.settings`. */
export function updateSetting<K extends keyof PlayerSettings>(
  key: K,
  value: PlayerSettings[K],
): void {
  if (current[key] === value) return;
  current = { ...current, [key]: value };
  emit();
  if (playerId) void savePlayerSettings(playerId, current);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSettings(): PlayerSettings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}

/** Intervalo (ms) do loop de combate para a velocidade atual. */
export function useCombatTickMs(): number {
  const s = useSettings();
  return COMBAT_TICK_MS[s.combatSpeed];
}

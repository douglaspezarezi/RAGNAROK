"use client";

/**
 * Estado do tutorial/onboarding.
 *
 * `completed` vem de `players.tutorial_completed`. Enquanto `false`, o
 * `AppShell` mostra o `<TutorialOverlay />` logo após o login. Concluir ou pular
 * marca a coluna e não volta a aparecer. As Configurações podem reabrir a
 * sequência a qualquer momento (`reopenTutorial`), sem mexer na coluna.
 */

import { useSyncExternalStore } from "react";

import { setTutorialCompleted } from "./persistence";

interface TutorialState {
  playerId: string | null;
  completed: boolean;
  /** `true` enquanto o overlay deve estar na tela. */
  visible: boolean;
}

let state: TutorialState = { playerId: null, completed: true, visible: false };
const listeners = new Set<() => void>();

function set(next: Partial<TutorialState>): void {
  state = { ...state, ...next };
  for (const l of listeners) l();
}

/** Chamado pelo `gameStore.hydrate` no login. */
export function hydrateTutorial(playerId: string, completed: boolean): void {
  set({ playerId, completed, visible: !completed });
}

export function clearTutorial(): void {
  set({ playerId: null, completed: true, visible: false });
}

/** Conclui/pula o tutorial: some da tela e marca `players.tutorial_completed`. */
export function finishTutorial(): void {
  const pid = state.playerId;
  set({ completed: true, visible: false });
  if (pid) void setTutorialCompleted(pid);
}

/** Reabre a sequência manualmente (botão "Rever tutorial" nas Configurações). */
export function reopenTutorial(): void {
  set({ visible: true });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const SERVER: TutorialState = {
  playerId: null,
  completed: true,
  visible: false,
};

export function useTutorial(): TutorialState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER,
  );
}

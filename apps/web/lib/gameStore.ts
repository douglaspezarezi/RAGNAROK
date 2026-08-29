"use client";

/**
 * Store do personagem — agora com persistência no Supabase (antes: localStorage).
 *
 * A INTERFACE PÚBLICA é a mesma de antes, então os componentes da tela
 * (`Game.tsx`, `BattleArena`, ...) não mudam:
 *   - `useGameSave()`  — leitura reativa
 *   - `getSave()`      — leitura imperativa (loop de combate)
 *   - `recordKill()` / `advanceStage()` / `resetSave()`
 *   - helpers puros reexportados de `gameSave.ts`
 *
 * A diferença é por dentro: em vez de `localStorage`, o estado é hidratado a
 * partir do banco (via `hydrate()`, chamado pelo `AppShell` depois do login) e
 * salvo de forma assíncrona — a cada 10s de jogo ativo e em eventos importantes
 * (subir de nível, avançar estágio), nunca a cada tick.
 */

import { useSyncExternalStore } from "react";

import { MONSTERS_BY_ID } from "@game/data";
import {
  calculateOfflineRewards,
  type OfflineRewardsSummary,
} from "@game/core";

import {
  applyAdvanceStage,
  applyKill,
  applyOfflineRewards,
  createInitialSave,
  type ApplyKillInput,
  type GameSave,
} from "./gameSave";
import {
  insertOfflineSession,
  resetCharacter,
  saveBundle,
  touchLastSeen,
  type LoadedBundle,
} from "./persistence";

export {
  createInitialSave,
  getStageMonsters,
  LEVEL_UP_ATTRIBUTE_GROWTH,
  xpToNextLevel,
  type GameSave,
} from "./gameSave";

/** Diferença mínima (s) desde `last_seen_at` para contar como "esteve fora". */
export const OFFLINE_MIN_SECONDS = 60;

const AUTOSAVE_INTERVAL_MS = 10_000;

export type RecordKillInput = ApplyKillInput;

interface StoreMeta {
  playerId: string;
  characterId: string;
  /** `last_seen_at` conhecido, em epoch ms. */
  lastSeenAtMs: number;
}

/* -------------------------------------------------------------------------- */
/*  Estado do módulo                                                           */
/* -------------------------------------------------------------------------- */

let clientState: GameSave | null = null;
let meta: StoreMeta | null = null;
let dirty = false;
let backgrounded = false;
let autosaveTimer: ReturnType<typeof setInterval> | null = null;
/** Serializa os saves — nunca dois em paralelo, nenhum save perdido. */
let saveChain: Promise<void> = Promise.resolve();

const listeners = new Set<() => void>();

let SERVER_SNAPSHOT: GameSave | null = null;
function getServerSnapshot(): GameSave {
  SERVER_SNAPSHOT ??= createInitialSave();
  return SERVER_SNAPSHOT;
}

function getSnapshot(): GameSave {
  return clientState ?? getServerSnapshot();
}

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commit(next: GameSave): void {
  clientState = next;
  dirty = true;
  emit();
}

/* -------------------------------------------------------------------------- */
/*  Ciclo de vida (chamado pelo AppShell)                                      */
/* -------------------------------------------------------------------------- */

/** Preenche o store com o save carregado do banco. */
export function hydrate(bundle: LoadedBundle): void {
  clientState = bundle.save;
  meta = {
    playerId: bundle.playerId,
    characterId: bundle.characterId,
    lastSeenAtMs: bundle.lastSeenAtMs,
  };
  dirty = false;
  emit();
}

export function isHydrated(): boolean {
  return clientState !== null && meta !== null;
}

/** Limpa tudo (logout). */
export function clearStore(): void {
  stopAutosave();
  clientState = null;
  meta = null;
  dirty = false;
  backgrounded = false;
  emit();
}

export function getMeta(): StoreMeta | null {
  return meta ? { ...meta } : null;
}

/** Pausa/religa o autosave enquanto a aba está em segundo plano. */
export function setBackgrounded(value: boolean): void {
  backgrounded = value;
}

export function startAutosave(): void {
  if (autosaveTimer !== null) return;
  autosaveTimer = setInterval(() => {
    if (backgrounded || !dirty) return;
    void saveNow();
  }, AUTOSAVE_INTERVAL_MS);
}

export function stopAutosave(): void {
  if (autosaveTimer !== null) {
    clearInterval(autosaveTimer);
    autosaveTimer = null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Save                                                                       */
/* -------------------------------------------------------------------------- */

async function doSave(): Promise<void> {
  if (!clientState || !meta) return;

  if (!dirty) {
    // nada mudou -> só marca presença
    await touchLastSeen(meta.playerId);
    meta.lastSeenAtMs = Date.now();
    return;
  }

  const snapshot = clientState;
  const ok = await saveBundle(
    { playerId: meta.playerId, characterId: meta.characterId },
    snapshot,
  );
  if (ok) {
    meta.lastSeenAtMs = Date.now();
    if (clientState === snapshot) dirty = false; // nada mudou durante o save
  }
  // em falha, `dirty` continua true e o próximo save tenta de novo
}

/**
 * Enfileira um save do estado atual. Chamadas concorrentes são serializadas na
 * mesma cadeia; o promise devolvido resolve quando o save correspondente termina.
 * Sem-op se nada mudou (`dirty === false`) ou se não hidratado.
 */
export function saveNow(): Promise<void> {
  saveChain = saveChain.catch(() => {}).then(doSave);
  return saveChain;
}

/** Aguarda todos os saves enfileirados terminarem. */
export function flushSaves(): Promise<void> {
  return saveChain.catch(() => {});
}

/* -------------------------------------------------------------------------- */
/*  Progresso offline                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Compara `Date.now()` com o `last_seen_at` conhecido. Se passou do limite,
 * calcula as recompensas offline (`@game/core`), aplica ao personagem, registra
 * em `offline_sessions`, persiste, e devolve o resumo para a UI mostrar o modal.
 * Retorna `null` quando não há nada relevante a creditar.
 */
export async function checkOfflineProgress(): Promise<OfflineRewardsSummary | null> {
  if (!clientState || !meta) return null;

  const startedAtMs = meta.lastSeenAtMs;
  const elapsedSeconds = (Date.now() - startedAtMs) / 1000;
  if (elapsedSeconds < OFFLINE_MIN_SECONDS) {
    void saveNow(); // mantém o last_seen fresco
    return null;
  }

  const summary = calculateOfflineRewards(
    clientState.character,
    clientState.character.currentStageId,
    elapsedSeconds,
  );

  const nothing =
    summary.xp <= 0 &&
    summary.gold <= 0 &&
    !summary.sealFragments &&
    !summary.companionFragments;
  if (nothing) {
    void saveNow();
    return null;
  }

  const { save } = applyOfflineRewards(clientState, summary);
  commit(save);

  await insertOfflineSession(
    meta.characterId,
    startedAtMs,
    Date.now(),
    summary,
  );
  await saveNow();

  return summary;
}

/* -------------------------------------------------------------------------- */
/*  Hooks / leitura                                                            */
/* -------------------------------------------------------------------------- */

export function useGameSave(): GameSave {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getSave(): GameSave {
  return getSnapshot();
}

/* -------------------------------------------------------------------------- */
/*  Ações (mesma assinatura de antes)                                          */
/* -------------------------------------------------------------------------- */

export function recordKill(input: RecordKillInput): {
  levelsGained: number;
  chapterCleared: boolean;
} {
  if (!clientState) return { levelsGained: 0, chapterCleared: false };
  const { save, levelsGained, chapterCleared } = applyKill(clientState, input);
  commit(save);
  // evento importante -> salva já; kill "comum" fica para o autosave de 10s
  if (levelsGained > 0 || chapterCleared) void saveNow();
  return { levelsGained, chapterCleared };
}

export function advanceStage(): { ok: boolean; toChapter?: number } {
  if (!clientState) return { ok: false };
  const current = MONSTERS_BY_ID.get(clientState.character.currentStageId);
  if (!current) return { ok: false };
  const { save, ok, toChapter } = applyAdvanceStage(
    clientState,
    current.chapterNumber,
  );
  if (ok) {
    commit(save);
    void saveNow();
  }
  return { ok, toChapter };
}

/** Reinicia o personagem no banco e no store. */
export async function resetSave(): Promise<void> {
  if (!meta) return;
  commit(createInitialSave());
  await resetCharacter({
    playerId: meta.playerId,
    characterId: meta.characterId,
  });
  meta.lastSeenAtMs = Date.now();
  dirty = false;
}

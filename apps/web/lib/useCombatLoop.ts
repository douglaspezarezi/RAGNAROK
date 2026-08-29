"use client";

/**
 * Loop de combate solo reaproveitável (tela de Eventos).
 *
 * As REGRAS são as mesmas do jogo principal — `simulateCombatTick` /
 * `deriveMonsterStats` de `@game/core`. Aqui só há a orquestração de render:
 * intervalo de 1s, HP do herói/monstro, revive sem penalidade, ciclo de alvos.
 * O componente `Game.tsx` mantém o seu próprio loop; este é uma cópia leve de
 * SCAFFOLDING (não de regras) para telas separadas.
 */

import { useEffect, useRef, useState } from "react";

import type { Monster } from "@game/data";
import {
  calculateDerivedStats,
  deriveMonsterStats,
  simulateCombatTick,
} from "@game/core";

import { getSave } from "./gameStore";

const TICK_MS = 1000;

export interface CombatLoopState {
  heroHp: number;
  heroMaxHp: number;
  monster: Monster | null;
  monsterHp: number;
  monsterMaxHp: number;
  /** Monstros derrotados nesta sessão de combate. */
  kills: number;
  /** Dano acumulado nesta sessão. */
  totalDamage: number;
  running: boolean;
}

export interface UseCombatLoopOptions {
  /** Pool de monstros do estágio; o loop cicla entre eles a cada kill. */
  monsters: Monster[];
  /** Liga/desliga o loop. */
  active: boolean;
  /** Chamado a cada monstro derrotado (kills e dano já acumulados). */
  onKill?: (kills: number, totalDamage: number) => void;
}

export function useCombatLoop({
  monsters,
  active,
  onKill,
}: UseCombatLoopOptions): CombatLoopState & { reset: () => void } {
  const [state, setState] = useState<CombatLoopState>(() =>
    initialState(monsters),
  );

  const monstersRef = useRef(monsters);
  const onKillRef = useRef(onKill);
  monstersRef.current = monsters;
  onKillRef.current = onKill;

  // reinicia quando o conjunto de monstros muda (troca de evento)
  useEffect(() => {
    setState(initialState(monstersRef.current));
  }, [monsters]);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setState((prev) => tick(prev, monstersRef.current, onKillRef.current));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [active]);

  return {
    ...state,
    reset: () => setState(initialState(monstersRef.current)),
  };
}

function initialState(monsters: Monster[]): CombatLoopState {
  const first = monsters[0] ?? null;
  const heroMaxHp = safeHeroMaxHp();
  const monsterMaxHp = first ? deriveMonsterStats(first).maxHp : 0;
  return {
    heroHp: heroMaxHp,
    heroMaxHp,
    monster: first,
    monsterHp: monsterMaxHp,
    monsterMaxHp,
    kills: 0,
    totalDamage: 0,
    running: monsters.length > 0,
  };
}

function safeHeroMaxHp(): number {
  try {
    return calculateDerivedStats(getSave().character).maxHp;
  } catch {
    return 1;
  }
}

function tick(
  prev: CombatLoopState,
  monsters: Monster[],
  onKill: UseCombatLoopOptions["onKill"],
): CombatLoopState {
  if (monsters.length === 0 || !prev.monster) return prev;

  const derived = calculateDerivedStats(getSave().character);
  const result = simulateCombatTick(derived, prev.monster, TICK_MS / 1000);
  const regenHp = derived.hpRegenPerSec * (TICK_MS / 1000);

  const heroMaxHp = derived.maxHp;
  const hpAfter = prev.heroHp - result.damageTaken + regenHp;
  const monsterHpAfter = prev.monsterHp - result.damageDealt;
  const dealtThisTick = Math.max(0, result.damageDealt);

  // herói cai -> revive com HP cheio (sem penalidade, igual ao jogo principal)
  if (hpAfter <= 0) {
    return {
      ...prev,
      heroMaxHp,
      heroHp: heroMaxHp,
      monsterHp: Math.max(0, monsterHpAfter),
      totalDamage: prev.totalDamage + dealtThisTick,
    };
  }

  // monstro sobrevive
  if (monsterHpAfter > 0) {
    return {
      ...prev,
      heroMaxHp,
      heroHp: Math.min(heroMaxHp, hpAfter),
      monsterHp: monsterHpAfter,
      totalDamage: prev.totalDamage + dealtThisTick,
    };
  }

  // monstro derrotado -> próximo alvo do ciclo
  const kills = prev.kills + 1;
  const totalDamage = prev.totalDamage + dealtThisTick;
  const next = monsters[kills % monsters.length];
  const nextMaxHp = deriveMonsterStats(next).maxHp;
  onKill?.(kills, totalDamage);

  return {
    heroMaxHp,
    heroHp: Math.min(heroMaxHp, hpAfter),
    monster: next,
    monsterHp: nextMaxHp,
    monsterMaxHp: nextMaxHp,
    kills,
    totalDamage,
    running: true,
  };
}

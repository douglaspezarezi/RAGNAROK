/**
 * `@game/data` — ponto de entrada único dos dados do jogo.
 *
 * Consumido por `@game/core` (lógica de combate/idle) e por `apps/web` (UI).
 * Este pacote é 100% dados + tipos: nenhuma lógica de jogo mora aqui.
 */

export * from "./types";

export { MONSTERS, BOSSES, CHAPTERS, type MonsterId } from "./bestiary";
export { JOBS, BASE_JOBS, type JobId } from "./classes";
export { BATTLE_SEALS, type BattleSealId } from "./battleSeals";
export { COMPANIONS, type CompanionId } from "./companions";

import { MONSTERS } from "./bestiary";
import { JOBS } from "./classes";
import { BATTLE_SEALS } from "./battleSeals";
import { COMPANIONS } from "./companions";
import type { Monster, JobClass, BattleSeal, Companion } from "./types";

/** Índice `id -> Monster`. */
export const MONSTERS_BY_ID: ReadonlyMap<string, Monster> = new Map(
  MONSTERS.map((m) => [m.id, m]),
);

/** Índice `id -> JobClass`. */
export const JOBS_BY_ID: ReadonlyMap<string, JobClass> = new Map(
  JOBS.map((j) => [j.id, j]),
);

/** Índice `id -> BattleSeal`. */
export const BATTLE_SEALS_BY_ID: ReadonlyMap<string, BattleSeal> = new Map(
  BATTLE_SEALS.map((s) => [s.id, s]),
);

/** Índice `id -> Companion`. */
export const COMPANIONS_BY_ID: ReadonlyMap<string, Companion> = new Map(
  COMPANIONS.map((c) => [c.id, c]),
);

/**
 * Ordenação canônica de progressão de estágio — usada pelo Ranking de Estágio.
 *
 * Converte o `currentStageId` (id de um monstro do bestiário) num inteiro
 * comparável entre jogadores: quanto maior, mais avançado. A ordem segue
 * capítulo -> nível do monstro -> comum antes de chefe.
 *
 * Puro: só depende de `@game/data`.
 */

import { MONSTERS, MONSTERS_BY_ID, type Monster } from "@game/data";

/** Todos os monstros na ordem de progressão do jogo. */
export const MONSTER_PROGRESSION: readonly Monster[] = [...MONSTERS].sort(
  (a, b) =>
    a.chapterNumber - b.chapterNumber ||
    a.level - b.level ||
    (a.isBoss ? 1 : 0) - (b.isBoss ? 1 : 0),
);

const INDEX_BY_ID = new Map<string, number>(
  MONSTER_PROGRESSION.map((m, i) => [m.id, i]),
);

/** Índice de progresso (0..N-1) do estágio. `0` para id desconhecido. */
export function stageProgressIndex(stageId: string): number {
  return INDEX_BY_ID.get(stageId) ?? 0;
}

/** Rótulo legível de um índice de progresso (ex.: "Cap. 3 · Mandrágora Cintilante"). */
export function progressLabel(progressIndex: number): string {
  const m = MONSTER_PROGRESSION[progressIndex];
  if (!m) return "—";
  return `Cap. ${m.chapterNumber} · ${m.name}`;
}

/** Rótulo a partir de um `stageId` (atalho para os dois de cima). */
export function stageLabel(stageId: string): string {
  const m = MONSTERS_BY_ID.get(stageId);
  return m ? `Cap. ${m.chapterNumber} · ${m.name}` : "—";
}

/** Total de estágios — denominador para barras de progresso. */
export const PROGRESSION_TOTAL = MONSTER_PROGRESSION.length;

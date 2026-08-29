/**
 * Seletores puros sobre os dados estáticos de `@game/data`.
 * Sem estado, sem side effects.
 */

import {
  BATTLE_SEALS,
  JOBS,
  MONSTERS,
  type BattleSeal,
  type ClassLine,
  type EquipmentSlot,
  type JobClass,
  type Monster,
} from "@game/data";

/** Monstros de um capítulo, ordenados por nível. */
export function getMonstersByChapter(chapterNumber: number): Monster[] {
  return MONSTERS.filter((m) => m.chapterNumber === chapterNumber).sort(
    (a, b) => a.level - b.level,
  );
}

/** Toda a árvore de jobs de uma linha de classe. */
export function getJobsByLine(line: ClassLine): JobClass[] {
  return JOBS.filter((j) => j.line === line).sort((a, b) => a.tier - b.tier);
}

/** Caminho de evolução de um job até a raiz (do mais novo para o Job 1). */
export function getEvolutionPath(jobId: string): JobClass[] {
  const byId = new Map<string, JobClass>(JOBS.map((j) => [j.id, j]));
  const path: JobClass[] = [];
  let current = byId.get(jobId);
  while (current) {
    path.push(current);
    current = current.previousJobId ? byId.get(current.previousJobId) : undefined;
  }
  return path;
}

/** Selos que se encaixam em um slot de equipamento. */
export function getSealsForSlot(slot: EquipmentSlot): BattleSeal[] {
  return BATTLE_SEALS.filter((s) => s.equipmentSlot === slot);
}

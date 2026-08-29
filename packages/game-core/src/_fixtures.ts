/**
 * Helpers compartilhados pelos testes. Não faz parte da API pública do pacote
 * (não é reexportado por `index.ts`).
 */

import type { AttributeBlock, CharacterState } from "./character";

export function attrs(overrides: Partial<AttributeBlock> = {}): AttributeBlock {
  return { FOR: 0, AGI: 0, VIT: 0, INT: 0, DES: 0, SOR: 0, ...overrides };
}

export function makeCharacter(
  overrides: Partial<CharacterState> = {},
): CharacterState {
  return {
    level: 1,
    jobId: "recruta",
    baseAttributes: attrs(),
    equippedSeals: [],
    currentStageId: "gotinha",
    ...overrides,
  };
}

/** Gera um `RandomSource` determinístico que percorre `values` ciclicamente. */
export function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

/** Clone profundo simples para snapshots de pureza (objetos JSON-serializáveis). */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

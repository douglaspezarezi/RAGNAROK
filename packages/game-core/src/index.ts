/**
 * `@game/core` — lógica pura do jogo (combate + progressão idle).
 *
 * Tudo aqui são funções puras: mesma entrada -> mesma saída, sem side effects,
 * sem UI, sem rede. Consome só `@game/data`.
 *
 * Módulos:
 *  - `character`        — `CharacterState`, `calculateDerivedStats`
 *  - `monster`          — `deriveMonsterStats`, resistência elemental
 *  - `combat`           — `simulateCombatTick`, `resolveMonsterDefeat`
 *  - `offlineProgress`  — `calculateOfflineRewards` (GDD 8.1)
 *  - `gacha`            — `rollSummon` (GDD 8.2)
 *  - `rebirth`          — `canRebirth`, `applyRebirth` (GDD 8.3)
 *  - `sealEffects`      — parser dos textos de efeito dos Selos
 *  - `selectors`        — consultas puras sobre os dados
 */

export * from "./sealEffects";
export * from "./character";
export * from "./monster";
export * from "./combat";
export * from "./offlineProgress";
export * from "./gacha";
export * from "./rebirth";
export * from "./selectors";

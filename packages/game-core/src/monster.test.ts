import { MONSTERS_BY_ID } from "@game/data";
import { describe, expect, it } from "vitest";

import {
  BOSS_MULTIPLIER,
  MONSTER_TUNING,
  deriveMonsterStats,
  monsterElementalResistPercent,
} from "./monster";

const coelhal = MONSTERS_BY_ID.get("coelhal")!;
const serpente = MONSTERS_BY_ID.get("serpente-das-profundezas")!;

describe("deriveMonsterStats", () => {
  it("caso normal: monstro comum tem fator de chefe 1", () => {
    const s = deriveMonsterStats(coelhal);
    expect(s.bossFactorKey).toBe("none");
    expect(s.bossFactor).toBe(1);
    expect(s.maxHp).toBeGreaterThan(0);
    expect(s.atk).toBeGreaterThan(0);
  });

  it("caso de borda: MVP Final usa o multiplicador MVP_FINAL", () => {
    const s = deriveMonsterStats(serpente); // Nv 150, MVP Final
    expect(s.bossFactorKey).toBe("MVP_FINAL");
    const M = MONSTER_TUNING;
    const baseHp = M.BASE_HP + M.HP_PER_LEVEL * 150;
    expect(s.maxHp).toBe(Math.round(baseHp * BOSS_MULTIPLIER.MVP_FINAL));
    // e um monstro comum de mesmo nível teria 1/40 disso
    const plain = deriveMonsterStats({
      ...serpente,
      isBoss: false,
      isFinalBoss: false,
      bossRank: undefined,
    });
    expect(s.maxHp).toBe(plain.maxHp * BOSS_MULTIPLIER.MVP_FINAL);
  });
});

describe("monsterElementalResistPercent", () => {
  it("caso normal: ataque Neutro nunca é resistido", () => {
    expect(monsterElementalResistPercent(serpente, "Neutro")).toBe(0);
  });

  it("caso de borda: ataque do mesmo elemento nível 3 = resistência total", () => {
    // serpente-das-profundezas é "Água 3"
    expect(monsterElementalResistPercent(serpente, "Água")).toBe(100);
  });

  it("caso de borda: elemento diferente = 0 (tabela de fraquezas é TODO)", () => {
    expect(monsterElementalResistPercent(serpente, "Fogo")).toBe(0);
  });
});

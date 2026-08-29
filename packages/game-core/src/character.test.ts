import { describe, expect, it } from "vitest";

import {
  CHARACTER_TUNING,
  calculateDerivedStats,
  computeClassContribution,
} from "./character";
import { attrs, clone, makeCharacter } from "./_fixtures";

describe("calculateDerivedStats", () => {
  it("caso normal: soma atributos base + foco de classe + Selos", () => {
    const base = makeCharacter({
      level: 50,
      jobId: "marechal-de-aco", // linha Guerreiro, tier 4, foco FOR/VIT
      baseAttributes: attrs({ FOR: 30, VIT: 20 }),
    });
    const withSeal = calculateDerivedStats({
      ...base,
      equippedSeals: ["selo-do-broteiro"], // "VIT +2, HP Máx +250"
    });

    // cadeia marechal->vanguarda->sentinela: 3 jobs com foco {FOR,VIT} => +9 cada
    expect(withSeal.attributes.FOR).toBe(30 + 9);
    expect(withSeal.attributes.VIT).toBe(20 + 9 + 2); // +2 do Selo

    // powerMultiplier de tier 4 = 1 + 3 * POWER_MULT_PER_TIER
    expect(computeClassContribution("marechal-de-aco").powerMultiplier).toBeCloseTo(
      1 + 3 * 0.08,
    );

    const noSeal = calculateDerivedStats(base);
    expect(withSeal.maxHp).toBeGreaterThan(noSeal.maxHp);
    expect(withSeal.atk).toBeGreaterThan(0);
    expect(withSeal.aspd).toBeGreaterThan(0);
  });

  it("caso normal: efeitos de mitigação dos Selos viram tabelas de dano recebido", () => {
    const ds = calculateDerivedStats(
      makeCharacter({
        level: 60,
        equippedSeals: [
          "selo-do-guerreiro-caido", // "Redução de dano de Morto-vivo -10%"
          "selo-da-pantera-sombria", // "Redução de dano de Sombrio -10%"
        ],
      }),
    );
    expect(ds.damageTaken.vsRace["Morto-vivo"]).toBe(-10);
    expect(ds.damageTaken.vsElement["Sombrio"]).toBe(-10);
  });

  it("caso de borda: personagem no nível mínimo, sem job válido, sem Selos", () => {
    const ds = calculateDerivedStats(
      makeCharacter({ level: 1, jobId: "", baseAttributes: attrs() }),
    );
    const T = CHARACTER_TUNING;
    // maxHp = BASE_HP + HP_PER_LEVEL*1 + HP_PER_VIT*0, powerMult = 1
    expect(ds.maxHp).toBe(T.BASE_HP + T.HP_PER_LEVEL);
    expect(ds.atk).toBe(T.ATK_PER_LEVEL); // só o termo de nível
    expect(Number.isFinite(ds.maxSp)).toBe(true);
    expect(ds.aspd).toBeGreaterThanOrEqual(T.ASPD_MIN);
    expect(ds.aspd).toBeLessThanOrEqual(T.ASPD_MAX);
    expect(ds.attackType).toBe("physical");
  });

  it("caso de borda: Selo duplicado no array conta uma vez só", () => {
    const ds = calculateDerivedStats(
      makeCharacter({ equippedSeals: ["selo-do-broteiro", "selo-do-broteiro"] }),
    );
    expect(ds.equippedSealIds).toEqual(["selo-do-broteiro"]);
    // VIT +2 aplicado uma vez
    expect(ds.attributes.VIT).toBe(2);
  });

  it("é pura: não muta o CharacterState recebido", () => {
    const character = makeCharacter({
      level: 10,
      baseAttributes: attrs({ FOR: 5 }),
      equippedSeals: ["selo-do-broteiro"],
    });
    const snapshot = clone(character);
    calculateDerivedStats(character);
    expect(character).toEqual(snapshot);
  });
});

import { describe, expect, it } from "vitest";

import {
  REBIRTH_MIN_LEVEL,
  REBIRTH_STARTING_STAGE_ID,
  applyRebirth,
  canRebirth,
  getRebirthMultiplier,
} from "./rebirth";
import { attrs, clone, makeCharacter } from "./_fixtures";

describe("canRebirth", () => {
  it("caso normal: nível >= mínimo libera o rebirth", () => {
    expect(canRebirth(makeCharacter({ level: REBIRTH_MIN_LEVEL }))).toBe(true);
    expect(canRebirth(makeCharacter({ level: 150 }))).toBe(true);
  });

  it("caso normal: Capítulo 8 concluído libera mesmo com nível baixo", () => {
    expect(
      canRebirth(makeCharacter({ level: 30, clearedChapters: [1, 8] })),
    ).toBe(true);
  });

  it("caso de borda: um nível abaixo do mínimo e sem capítulo => false", () => {
    expect(canRebirth(makeCharacter({ level: REBIRTH_MIN_LEVEL - 1 }))).toBe(
      false,
    );
  });

  it("caso de borda: só capítulos < 8 concluídos => false", () => {
    expect(
      canRebirth(makeCharacter({ level: 20, clearedChapters: [5, 6, 7] })),
    ).toBe(false);
  });
});

describe("applyRebirth", () => {
  it("caso normal: reseta progresso, preserva coleções, incrementa o contador", () => {
    const character = makeCharacter({
      level: 120,
      xp: 5000,
      jobId: "marechal-de-aco",
      baseAttributes: attrs({ FOR: 50, VIT: 40 }),
      equippedSeals: ["selo-do-coelhal"],
      currentStageId: "aracnil",
      rebirthCount: 1,
      clearedChapters: [1, 2, 3, 4, 5, 6, 7, 8],
      ownedCompanionIds: ["vendaval", "coelhal-bebe"],
      unlockedAchievementIds: ["primeiro-chefe"],
    });
    const reborn = applyRebirth(character);

    // resetado
    expect(reborn.level).toBe(1);
    expect(reborn.xp).toBe(0);
    expect(reborn.currentStageId).toBe(REBIRTH_STARTING_STAGE_ID);
    expect(reborn.clearedChapters).toEqual([]);
    expect(reborn.clearedStageIds).toEqual([]);
    // incrementado
    expect(reborn.rebirthCount).toBe(2);
    // preservado (por valor)
    expect(reborn.jobId).toBe("marechal-de-aco");
    expect(reborn.baseAttributes).toEqual({ ...attrs({ FOR: 50, VIT: 40 }) });
    expect(reborn.equippedSeals).toEqual(["selo-do-coelhal"]);
    expect(reborn.ownedCompanionIds).toEqual(["vendaval", "coelhal-bebe"]);
    expect(reborn.unlockedAchievementIds).toEqual(["primeiro-chefe"]);
  });

  it("é pura: devolve novo objeto e não muta a entrada (nem por aliasing)", () => {
    const character = makeCharacter({
      level: 120,
      equippedSeals: ["selo-do-coelhal"],
      baseAttributes: attrs({ FOR: 10 }),
      ownedCompanionIds: ["vendaval"],
    });
    const snapshot = clone(character);
    const reborn = applyRebirth(character);

    expect(character).toEqual(snapshot); // entrada intacta
    expect(reborn).not.toBe(character);
    expect(reborn.equippedSeals).not.toBe(character.equippedSeals);
    expect(reborn.baseAttributes).not.toBe(character.baseAttributes);

    // mutar a saída não afeta a entrada
    reborn.equippedSeals.push("selo-da-gotinha");
    expect(character.equippedSeals).toEqual(["selo-do-coelhal"]);
  });

  it("caso de borda: personagem que não atende ao gatilho -> lança erro", () => {
    expect(() =>
      applyRebirth(makeCharacter({ level: REBIRTH_MIN_LEVEL - 1 })),
    ).toThrow(/gatilho/i);
  });

  it("caso de borda: rebirths encadeados continuam somando", () => {
    let c = makeCharacter({ level: 100 });
    c = applyRebirth(c);
    expect(c.rebirthCount).toBe(1);
    c = applyRebirth({ ...c, level: 100 });
    expect(c.rebirthCount).toBe(2);
  });
});

describe("getRebirthMultiplier", () => {
  it("caso normal: cresce +5% por rebirth", () => {
    expect(getRebirthMultiplier(makeCharacter())).toBe(1);
    expect(getRebirthMultiplier(makeCharacter({ rebirthCount: 3 }))).toBeCloseTo(
      1.15,
    );
  });

  it("caso de borda: rebirthCount ausente ou negativo => 1.0", () => {
    expect(getRebirthMultiplier(makeCharacter({ rebirthCount: -5 }))).toBe(1);
    expect(getRebirthMultiplier(makeCharacter())).toBe(1);
  });
});

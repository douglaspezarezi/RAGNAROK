import { describe, expect, it } from "vitest";

import {
  OFFLINE_CAP_HOURS,
  OFFLINE_EFFICIENCY_FACTOR,
  calculateOfflineRewards,
} from "./offlineProgress";
import { clone, makeCharacter } from "./_fixtures";

const HOUR = 3600;

describe("calculateOfflineRewards", () => {
  it("caso normal: 1h no estágio 'coelhal' rende XP e ouro, sem teto", () => {
    const s = calculateOfflineRewards(makeCharacter(), "coelhal", HOUR);
    expect(s.stageResolved).toBe(true);
    expect(s.wasCapped).toBe(false);
    expect(s.offlineSecondsCredited).toBe(HOUR);
    expect(s.creditedHours).toBe(1);
    expect(s.efficiencyFactor).toBe(OFFLINE_EFFICIENCY_FACTOR);
    expect(s.xp).toBeGreaterThan(0);
    expect(s.gold).toBeGreaterThan(0);
    expect(s.estimatedKills).toBeGreaterThan(0);
  });

  it("caso normal: mais tempo offline => mais recompensa (proporcional abaixo do teto)", () => {
    const oneHour = calculateOfflineRewards(makeCharacter(), "coelhal", HOUR);
    const twoHours = calculateOfflineRewards(makeCharacter(), "coelhal", 2 * HOUR);
    expect(twoHours.xp).toBeCloseTo(oneHour.xp * 2, -1);
  });

  it("aplica o fator de eficiência (< 1) sobre o rendimento bruto por hora", () => {
    const s = calculateOfflineRewards(makeCharacter(), "coelhal", HOUR);
    // estimativa de kills = killsPerHora * horas * eficiência  => menor que sem eficiência
    const killsSemEficiencia = s.estimatedKills / OFFLINE_EFFICIENCY_FACTOR;
    expect(s.estimatedKills).toBeLessThan(killsSemEficiencia);
  });

  it("caso de borda: 0 segundos offline => tudo zero", () => {
    const s = calculateOfflineRewards(makeCharacter(), "coelhal", 0);
    expect(s.stageResolved).toBe(true);
    expect(s.xp).toBe(0);
    expect(s.gold).toBe(0);
    expect(s.estimatedKills).toBe(0);
    expect(s.offlineSecondsCredited).toBe(0);
    expect(s.wasCapped).toBe(false);
  });

  it("caso de borda: acima do teto credita só OFFLINE_CAP_HOURS", () => {
    const s = calculateOfflineRewards(
      makeCharacter(),
      "coelhal",
      100 * HOUR,
    );
    expect(s.wasCapped).toBe(true);
    expect(s.offlineSecondsCredited).toBe(OFFLINE_CAP_HOURS * HOUR);
    expect(s.creditedHours).toBe(OFFLINE_CAP_HOURS);
  });

  it("caso de borda: tempo negativo => creditado 0, sem 'wasCapped'", () => {
    const s = calculateOfflineRewards(makeCharacter(), "coelhal", -500);
    expect(s.offlineSecondsCredited).toBe(0);
    expect(s.xp).toBe(0);
    expect(s.wasCapped).toBe(false);
  });

  it("caso de borda: estágio desconhecido => stageResolved false, tudo zero", () => {
    const s = calculateOfflineRewards(makeCharacter(), "estagio-inexistente", HOUR);
    expect(s.stageResolved).toBe(false);
    expect(s.xp).toBe(0);
    expect(s.gold).toBe(0);
  });

  it("rebirth aumenta as recompensas offline pelo multiplicador global", () => {
    const base = calculateOfflineRewards(makeCharacter(), "coelhal", HOUR);
    const reborn = calculateOfflineRewards(
      makeCharacter({ rebirthCount: 2 }),
      "coelhal",
      HOUR,
    );
    expect(reborn.rebirthMultiplier).toBeCloseTo(1.1);
    expect(reborn.xp).toBeGreaterThan(base.xp);
    expect(reborn.xp / base.xp).toBeCloseTo(1.1, 1);
  });

  it("é pura: não muta o CharacterState", () => {
    const character = makeCharacter({ rebirthCount: 1 });
    const snapshot = clone(character);
    calculateOfflineRewards(character, "coelhal", HOUR);
    expect(character).toEqual(snapshot);
  });
});

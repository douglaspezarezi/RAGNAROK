import { MONSTERS_BY_ID } from "@game/data";
import { describe, expect, it } from "vitest";

import { calculateDerivedStats } from "./character";
import {
  REWARD_TUNING,
  resolveMonsterDefeat,
  simulateCombatTick,
} from "./combat";
import { deriveMonsterStats } from "./monster";
import { attrs, clone, makeCharacter } from "./_fixtures";

const coelhal = MONSTERS_BY_ID.get("coelhal")!; // Nv 1, Neutro, sem Selo associado? tem "selo-do-coelhal"
const ovo = MONSTERS_BY_ID.get("ovo-rastejante")!; // Nv 10, sem Selo, sem Companheiro
const colossoDeAreia = MONSTERS_BY_ID.get("colosso-de-areia")!; // Mini, Nv 89, Selo "selo-do-colosso-de-areia" (Épico)
const serpente = MONSTERS_BY_ID.get("serpente-das-profundezas")!; // Água 3

const strongHero = calculateDerivedStats(
  makeCharacter({
    level: 40,
    jobId: "marechal-de-aco",
    baseAttributes: attrs({ FOR: 50, AGI: 40, VIT: 40, DES: 50 }),
  }),
);

describe("simulateCombatTick", () => {
  it("caso normal: herói forte derrota um monstro fraco em poucos segundos", () => {
    const r = simulateCombatTick(strongHero, coelhal, 5);
    expect(r.damageDealt).toBeGreaterThan(r.monsterMaxHp);
    expect(r.monsterDefeated).toBe(true);
    expect(r.monsterHpRemaining).toBe(0);
    expect(r.damageTaken).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.damageTaken)).toBe(true);
    expect(r.estimatedTimeToKillSeconds).toBeGreaterThan(0);
  });

  it("é determinística: mesma entrada -> mesmo resultado, sem mutar entradas", () => {
    const heroSnapshot = clone(strongHero);
    const monsterSnapshot = clone(coelhal);
    const a = simulateCombatTick(strongHero, coelhal, 3);
    const b = simulateCombatTick(strongHero, coelhal, 3);
    expect(a).toEqual(b);
    expect(strongHero).toEqual(heroSnapshot);
    expect(coelhal).toEqual(monsterSnapshot);
  });

  it("caso de borda: resistência elemental total zera o dano causado", () => {
    const hydroHero = { ...strongHero, attackElement: "Água" as const };
    const r = simulateCombatTick(hydroHero, serpente, 10);
    expect(r.elementalResistPercent).toBe(100);
    expect(r.damageDealt).toBe(0);
    expect(r.monsterDefeated).toBe(false);
    expect(r.estimatedTimeToKillSeconds).toBe(Number.POSITIVE_INFINITY);
  });

  it("caso de borda: deltaSeconds <= 0 -> tick zerado", () => {
    const r = simulateCombatTick(strongHero, coelhal, 0);
    expect(r.playerAttacks).toBe(0);
    expect(r.monsterAttacks).toBe(0);
    expect(r.damageDealt).toBe(0);
    expect(r.monsterDefeated).toBe(false);
    expect(r.monsterMaxHp).toBe(deriveMonsterStats(coelhal).maxHp);
  });

  it("mitigação: 'Redução de dano de X' reduz o dano recebido daquele monstro", () => {
    // pantera-sombria é Sombrio; o Selo reduz dano de Sombrio em -10%.
    const pantera = MONSTERS_BY_ID.get("pantera-sombria")!;
    const squishy = makeCharacter({
      level: 30,
      baseAttributes: attrs({ VIT: 10 }),
    });
    const withoutSeal = calculateDerivedStats(squishy);
    const withSeal = calculateDerivedStats({
      ...squishy,
      equippedSeals: ["selo-da-pantera-sombria"],
    });
    const dmgNoSeal = simulateCombatTick(withoutSeal, pantera, 10).damageTaken;
    const dmgWithSeal = simulateCombatTick(withSeal, pantera, 10).damageTaken;
    expect(dmgWithSeal).toBeLessThan(dmgNoSeal);
    expect(dmgWithSeal / dmgNoSeal).toBeCloseTo(0.9, 2);
  });
});

describe("resolveMonsterDefeat", () => {
  it("caso normal: XP/ouro e fragmentos associados ao monstro", () => {
    const rewards = resolveMonsterDefeat(coelhal, makeCharacter());
    // base XP = (BASE_XP + XP_PER_LEVEL*1) * bônus(none=1)
    expect(rewards.xp).toBe(REWARD_TUNING.BASE_XP + REWARD_TUNING.XP_PER_LEVEL);
    expect(rewards.gold).toBe(
      REWARD_TUNING.BASE_GOLD + REWARD_TUNING.GOLD_PER_LEVEL,
    );
    expect(rewards.sealFragment).toEqual({
      sealId: "selo-do-coelhal",
      dropChance: REWARD_TUNING.SEAL_FRAGMENT_BASE_CHANCE, // Comum + none
    });
    expect(rewards.companionFragment).toEqual({
      companionId: "coelhal-bebe",
      dropChance: REWARD_TUNING.COMPANION_FRAGMENT_BASE_CHANCE,
    });
    expect(rewards.rebirthMultiplier).toBe(1);
  });

  it("caso normal: chefe Mini multiplica XP e chance de drop", () => {
    const rewards = resolveMonsterDefeat(colossoDeAreia, makeCharacter());
    const bonus = REWARD_TUNING.BOSS_XP_GOLD_BONUS.Mini;
    expect(rewards.xp).toBe(
      (REWARD_TUNING.BASE_XP + REWARD_TUNING.XP_PER_LEVEL * 89) * bonus,
    );
    // Épico -> RARITY_DROP_FACTOR 0.25 ; chefe Mini -> BOSS_DROP_BONUS 2.5
    expect(rewards.sealFragment?.sealId).toBe("selo-do-colosso-de-areia");
    expect(rewards.sealFragment?.dropChance).toBeCloseTo(
      REWARD_TUNING.SEAL_FRAGMENT_BASE_CHANCE *
        REWARD_TUNING.BOSS_DROP_BONUS.Mini *
        REWARD_TUNING.RARITY_DROP_FACTOR["Épico"]!,
    );
  });

  it("caso de borda: monstro sem Selo/Companheiro + rebirth aplica multiplicador", () => {
    const rewards = resolveMonsterDefeat(ovo, makeCharacter({ rebirthCount: 3 }));
    expect(rewards.sealFragment).toBeNull();
    expect(rewards.companionFragment).toBeNull();
    expect(rewards.rebirthMultiplier).toBeCloseTo(1.15);
    const baseXp = REWARD_TUNING.BASE_XP + REWARD_TUNING.XP_PER_LEVEL * 10;
    expect(rewards.xp).toBe(Math.round(baseXp * 1.15));
  });

  it("é pura: não muta o CharacterState", () => {
    const character = makeCharacter({ rebirthCount: 2 });
    const snapshot = clone(character);
    resolveMonsterDefeat(coelhal, character);
    expect(character).toEqual(snapshot);
  });
});

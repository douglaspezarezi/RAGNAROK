import { describe, expect, it } from "vitest";

import {
  DUPLICATE_FRAGMENTS_BY_TIER,
  PITY_THRESHOLD,
  rollSummon,
} from "./gacha";
import { seq } from "./_fixtures";

describe("rollSummon", () => {
  it("caso normal: roll baixo sai Tier C e incrementa o pity", () => {
    // pickTier(0.1) -> 'C' (cumulativo C=0.5). Depois índice 0 do pool.
    const r = rollSummon("companion", 0, seq([0.1, 0]));
    expect(r.tier).toBe("C");
    expect(r.guaranteedByPity).toBe(false);
    expect(r.pityCounterBefore).toBe(0);
    expect(r.pityCounterAfter).toBe(1);
    expect(r.outcome).toBe("new");
    expect(r.fragmentsAwarded).toBe(0);
    expect(r.itemId).toBe("coelhal-bebe"); // 1º companheiro Tier C nos dados
    expect(r.itemKind).toBe("companion");
  });

  it("caso normal: roll alto sai Tier S naturalmente e zera o pity", () => {
    const r = rollSummon("companion", 12, seq([0.99, 0]));
    expect(r.tier).toBe("S");
    expect(r.guaranteedByPity).toBe(false);
    expect(r.pityCounterAfter).toBe(0);
  });

  it("caso de borda: pity no limite garante Tier S (ignora o rng do tier)", () => {
    const r = rollSummon("seal", PITY_THRESHOLD, seq([0, 0]));
    expect(r.guaranteedByPity).toBe(true);
    expect(r.tier).toBe("S");
    expect(r.pityCounterBefore).toBe(PITY_THRESHOLD);
    expect(r.pityCounterAfter).toBe(0);
    expect(r.itemKind).toBe("seal");
  });

  it("caso de borda: pity um passo antes do limite ainda depende do sorteio", () => {
    const r = rollSummon("companion", PITY_THRESHOLD - 1, seq([0.1, 0]));
    expect(r.guaranteedByPity).toBe(false);
    expect(r.tier).toBe("C");
    expect(r.pityCounterAfter).toBe(PITY_THRESHOLD);
  });

  it("caso de borda: pity zerado nunca garante nada", () => {
    const r = rollSummon("companion", 0, seq([0.4, 0]));
    expect(r.guaranteedByPity).toBe(false);
  });

  it("duplicata: item já possuído devolve fragmentos em vez de cópia", () => {
    const ownedIds = new Set(["coelhal-bebe"]);
    const r = rollSummon("companion", 0, seq([0.1, 0]), { ownedIds });
    expect(r.itemId).toBe("coelhal-bebe");
    expect(r.isDuplicate).toBe(true);
    expect(r.outcome).toBe("duplicate");
    expect(r.fragmentsAwarded).toBe(DUPLICATE_FRAGMENTS_BY_TIER.C);
  });

  it("sem ownedIds: sempre 'new' (o chamador decide a posse)", () => {
    const r = rollSummon("companion", 0, seq([0.1, 0]));
    expect(r.isDuplicate).toBe(false);
    expect(r.outcome).toBe("new");
  });

  it("é determinística: mesma sequência de rng -> mesmo resultado", () => {
    const a = rollSummon("seal", 3, seq([0.7, 0.42]));
    const b = rollSummon("seal", 3, seq([0.7, 0.42]));
    expect(a).toEqual(b);
  });

  it("pity acumula ao longo de vários rolls sem Tier S", () => {
    let pity = 0;
    for (let i = 0; i < 10; i++) {
      pity = rollSummon("companion", pity, seq([0.2, 0])).pityCounterAfter;
    }
    expect(pity).toBe(10);
  });
});

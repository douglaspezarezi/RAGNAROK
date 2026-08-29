import { describe, expect, it } from "vitest";

import {
  getSealMainModifiers,
  parseSealEffectText,
  type SealModifier,
} from "./sealEffects";

describe("parseSealEffectText", () => {
  it("caso normal: quebra vários fragmentos em modificadores tipados", () => {
    const mods = parseSealEffectText("SOR +1, Crítico +1%, Esquiva +1");
    expect(mods).toEqual<SealModifier[]>([
      { kind: "attribute", attribute: "SOR", amount: 1 },
      { kind: "stat", stat: "critChance", amount: 1, isPercent: true },
      { kind: "stat", stat: "flee", amount: 1, isPercent: false },
    ]);
  });

  it("caso normal: distingue redução de dano por raça e por elemento", () => {
    expect(parseSealEffectText("Redução de dano de Morto-vivo -10%")).toEqual([
      {
        kind: "damageTaken",
        source: { scope: "race", race: "Morto-vivo" },
        percent: -10,
      },
    ]);
    expect(parseSealEffectText("Redução de Sombrio -8%")).toEqual([
      {
        kind: "damageTaken",
        source: { scope: "element", element: "Sombrio" },
        percent: -8,
      },
    ]);
  });

  it("caso de borda: string vazia -> lista vazia", () => {
    expect(parseSealEffectText("")).toEqual([]);
    expect(parseSealEffectText("   ")).toEqual([]);
  });

  it("caso de borda: texto desconhecido vira 'unparsed' (nada é perdido)", () => {
    const mods = parseSealEffectText("Faz algo mágico e indescritível");
    expect(mods).toEqual([
      { kind: "unparsed", text: "Faz algo mágico e indescritível" },
    ]);
  });

  it("é pura: mesma entrada -> saída estruturalmente igual", () => {
    const a = parseSealEffectText("ATQ +40, 10% chance de Maldição");
    const b = parseSealEffectText("ATQ +40, 10% chance de Maldição");
    expect(a).toEqual(b);
    expect(a).toEqual([
      { kind: "stat", stat: "atk", amount: 40, isPercent: false },
      { kind: "proc", effect: "Maldição", chancePercent: 10 },
    ]);
  });
});

describe("getSealMainModifiers", () => {
  it("caso normal: lê o efeito principal de um Selo real por id", () => {
    // "Selo do Broteiro" -> "VIT +2, HP Máx +250"
    expect(getSealMainModifiers("selo-do-broteiro")).toEqual([
      { kind: "attribute", attribute: "VIT", amount: 2 },
      { kind: "stat", stat: "maxHp", amount: 250, isPercent: false },
    ]);
  });

  it("caso de borda: id inexistente -> lista vazia", () => {
    expect(getSealMainModifiers("selo-que-nao-existe")).toEqual([]);
  });
});

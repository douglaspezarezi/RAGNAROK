/**
 * Parser dos textos de efeito dos Selos de Batalha.
 *
 * Os Selos em `@game/data` guardam o efeito como texto livre em português
 * (ex.: `"SOR +1, Crítico +1%, Esquiva +1"`, `"Redução de dano de Sombrio -10%"`).
 * A lógica de combate precisa disso em forma estruturada — este módulo converte
 * cada `mainEffect` / `collectionBonus` numa lista de {@link SealModifier}.
 *
 * É uma função pura: `string -> SealModifier[]`. Nada que o parser não reconheça
 * vira `{ kind: "unparsed", text }`, então nenhum efeito é silenciosamente perdido.
 */

import {
  BATTLE_SEALS_BY_ID,
  type Attribute,
  type MonsterElement,
  type MonsterRace,
} from "@game/data";

/* -------------------------------------------------------------------------- */
/*  Tipos                                                                      */
/* -------------------------------------------------------------------------- */

/** Alvo de um modificador de dano: uma raça, um elemento, ou "todo elemental". */
export type DamageTarget =
  | { scope: "race"; race: MonsterRace }
  | { scope: "element"; element: MonsterElement }
  | { scope: "allElemental" };

/** Chaves de status planos/percentuais que um Selo pode alterar. */
export type SealStatKey =
  | "maxHp"
  | "maxSp"
  | "atk"
  | "matk"
  | "def"
  | "critChance"
  | "critResist"
  | "flee"
  | "hit"
  | "block"
  | "aspdPercent"
  | "moveSpeedPercent"
  | "spRegen"
  | "hpRegenPct10s"
  | "castTimeDeltaPercent"
  | "healingReceivedPercent"
  | "perception";

export type SealModifier =
  /** `FOR +1`, `Todos os atributos +3` (`attribute: "ALL"`). */
  | { kind: "attribute"; attribute: Attribute | "ALL"; amount: number }
  /** Alteração de um status. `isPercent` diz se `amount` é ponto percentual. */
  | { kind: "stat"; stat: SealStatKey; amount: number; isPercent: boolean }
  /** `Dano contra elemento Fogo +20%` — bônus de dano causado. */
  | {
      kind: "damageDealt";
      target: DamageTarget;
      percent: number;
      damageType: "any" | "physical" | "magical";
    }
  /** `Redução de dano de Sombrio -10%` — `percent` negativo = redução. */
  | { kind: "damageTaken"; source: DamageTarget; percent: number }
  /** `Esquiva +3 contra Inseto` — esquiva condicional por raça. */
  | { kind: "fleeVsRace"; race: MonsterRace; amount: number }
  /** `2% chance de Atordoar` — proc de combate (não afeta status derivados). */
  | { kind: "proc"; effect: string; chancePercent: number }
  /** `Imunidade a Medo`. */
  | { kind: "immunity"; to: string }
  /** `Reflete 5% do dano recebido`. */
  | { kind: "reflect"; percent: number }
  /** `15% chance de anular dano crítico recebido`. */
  | { kind: "negateCrit"; chancePercent: number }
  /** Texto não reconhecido — preservado para inspeção/telemetria. */
  | { kind: "unparsed"; text: string };

/* -------------------------------------------------------------------------- */
/*  Tabelas de tokens                                                          */
/* -------------------------------------------------------------------------- */

const RACE_TOKENS: Readonly<Record<string, MonsterRace>> = {
  Planta: "Planta",
  Bruto: "Bruto",
  Inseto: "Inseto",
  Anfíbio: "Anfíbio",
  Amorfo: "Amorfo",
  "Sem-Forma": "Amorfo", // sinônimo usado em alguns bônus de compêndio
  "Morto-vivo": "Morto-vivo",
  Demônio: "Demônio",
  Peixe: "Peixe",
  Dragão: "Dragão",
};

const ELEMENT_TOKENS: Readonly<Record<string, MonsterElement>> = {
  Neutro: "Neutro",
  Água: "Água",
  Terra: "Terra",
  Vento: "Vento",
  Fogo: "Fogo",
  Sombrio: "Sombrio",
  Fantasma: "Fantasma",
};

/** Resolve um token ("Fogo", "Morto-vivo", "Sem-Forma"...) num alvo de dano. */
function resolveDamageTarget(rawToken: string): DamageTarget | null {
  const token = rawToken.trim();
  const race = RACE_TOKENS[token];
  if (race) return { scope: "race", race };
  const element = ELEMENT_TOKENS[token];
  if (element) return { scope: "element", element };
  return null;
}

/** `"+20"` -> `20`, `"-5"` -> `-5`, `"3"` -> `3`. */
function num(raw: string): number {
  return Number(raw.replace(/\s+/g, ""));
}

/* -------------------------------------------------------------------------- */
/*  Matchers                                                                   */
/* -------------------------------------------------------------------------- */

type Matcher = (fragment: string) => SealModifier | SealModifier[] | null;

/**
 * Ordem importa: os padrões mais específicos vêm antes dos genéricos
 * (ex.: "Redução de tempo de conjuração" antes de "Redução de <X>").
 */
const MATCHERS: readonly Matcher[] = [
  // ---- atributos ----------------------------------------------------------
  (f) => {
    const m = /^Todos os atributos ([+-]?\d+)$/i.exec(f);
    return m ? { kind: "attribute", attribute: "ALL", amount: num(m[1]!) } : null;
  },
  (f) => {
    const m = /^(FOR|AGI|VIT|INT|DES|SOR) ([+-]?\d+)$/.exec(f);
    return m
      ? { kind: "attribute", attribute: m[1] as Attribute, amount: num(m[2]!) }
      : null;
  },

  // ---- crítico ----------------------------------------------------------
  (f) => {
    const m = /^Chance de crítico mágico ([+-]?\d+)%$/i.exec(f);
    return m
      ? { kind: "stat", stat: "critChance", amount: num(m[1]!), isPercent: true }
      : null;
  },
  (f) => {
    const m = /^Crítico ([+-]?\d+)%$/i.exec(f);
    return m
      ? { kind: "stat", stat: "critChance", amount: num(m[1]!), isPercent: true }
      : null;
  },

  // ---- esquiva --------------------------------------------------------
  (f) => {
    const m = /^Esquiva ([+-]?\d+) contra (.+)$/i.exec(f);
    if (!m) return null;
    const race = RACE_TOKENS[m[2]!.trim()];
    return race
      ? { kind: "fleeVsRace", race, amount: num(m[1]!) }
      : { kind: "unparsed", text: f };
  },
  (f) => {
    const m = /^Esquiva ([+-]?\d+)$/i.exec(f);
    return m
      ? { kind: "stat", stat: "flee", amount: num(m[1]!), isPercent: false }
      : null;
  },

  // ---- status com sufixo opcional de % ---------------------------------
  (f) => {
    const m = /^ATQ\.M ([+-]?\d+)(%)?$/i.exec(f);
    return m
      ? { kind: "stat", stat: "matk", amount: num(m[1]!), isPercent: m[2] === "%" }
      : null;
  },
  (f) => {
    const m = /^ATQ ([+-]?\d+)(%)?$/i.exec(f);
    return m
      ? { kind: "stat", stat: "atk", amount: num(m[1]!), isPercent: m[2] === "%" }
      : null;
  },
  (f) => {
    const m = /^HP Máx ([+-]?\d+)(%)?$/i.exec(f);
    return m
      ? { kind: "stat", stat: "maxHp", amount: num(m[1]!), isPercent: m[2] === "%" }
      : null;
  },
  (f) => {
    const m = /^SP Máx ([+-]?\d+)(%)?$/i.exec(f);
    return m
      ? { kind: "stat", stat: "maxSp", amount: num(m[1]!), isPercent: m[2] === "%" }
      : null;
  },
  (f) => {
    const m = /^DEF ([+-]?\d+)(%)?$/i.exec(f);
    return m
      ? { kind: "stat", stat: "def", amount: num(m[1]!), isPercent: m[2] === "%" }
      : null;
  },
  (f) => {
    const m = /^Acerto ([+-]?\d+)$/i.exec(f);
    return m
      ? { kind: "stat", stat: "hit", amount: num(m[1]!), isPercent: false }
      : null;
  },
  (f) => {
    const m = /^Bloqueio ([+-]?\d+)%$/i.exec(f);
    return m
      ? { kind: "stat", stat: "block", amount: num(m[1]!), isPercent: true }
      : null;
  },
  (f) => {
    const m = /^ASPD ([+-]?\d+)%$/i.exec(f);
    return m
      ? { kind: "stat", stat: "aspdPercent", amount: num(m[1]!), isPercent: true }
      : null;
  },
  (f) => {
    const m = /^Velocidade(?: de Movimento)? ([+-]?\d+)%$/i.exec(f);
    return m
      ? {
          kind: "stat",
          stat: "moveSpeedPercent",
          amount: num(m[1]!),
          isPercent: true,
        }
      : null;
  },
  (f) => {
    const m = /^SP regen ([+-]?\d+)$/i.exec(f);
    return m
      ? { kind: "stat", stat: "spRegen", amount: num(m[1]!), isPercent: false }
      : null;
  },
  (f) => {
    const m = /^HP regen ([+-]?\d+)%\/10s$/i.exec(f);
    return m
      ? {
          kind: "stat",
          stat: "hpRegenPct10s",
          amount: num(m[1]!),
          isPercent: true,
        }
      : null;
  },
  (f) => {
    const m = /^Percepção ([+-]?\d+)(?:\s*\(.*\))?$/i.exec(f);
    return m
      ? { kind: "stat", stat: "perception", amount: num(m[1]!), isPercent: false }
      : null;
  },
  (f) => {
    // "redução de tempo de conjuração -3%", "... fixo -5%" — negativo = mais rápido.
    const m = /^redução de tempo de conjuração(?: fixo)? ([+-]?\d+)%$/i.exec(f);
    return m
      ? {
          kind: "stat",
          stat: "castTimeDeltaPercent",
          amount: num(m[1]!),
          isPercent: true,
        }
      : null;
  },
  (f) => {
    const m = /^Cura recebida ([+-]?\d+)%$/i.exec(f);
    return m
      ? {
          kind: "stat",
          stat: "healingReceivedPercent",
          amount: num(m[1]!),
          isPercent: true,
        }
      : null;
  },

  // ---- dano causado -------------------------------------------------
  (f) => {
    const m = /^Dano contra elemento (.+?) ([+-]?\d+)%$/i.exec(f);
    if (!m) return null;
    const element = ELEMENT_TOKENS[m[1]!.trim()];
    return element
      ? {
          kind: "damageDealt",
          target: { scope: "element", element },
          percent: num(m[2]!),
          damageType: "any",
        }
      : { kind: "unparsed", text: f };
  },
  (f) => {
    const m = /^Dano contra raça (.+?) ([+-]?\d+)%$/i.exec(f);
    if (!m) return null;
    const race = RACE_TOKENS[m[1]!.trim()];
    return race
      ? {
          kind: "damageDealt",
          target: { scope: "race", race },
          percent: num(m[2]!),
          damageType: "any",
        }
      : { kind: "unparsed", text: f };
  },
  (f) => {
    const m = /^Dano vs\.? (.+?) ([+-]?\d+)%$/i.exec(f);
    if (!m) return null;
    const target = resolveDamageTarget(m[1]!);
    return target
      ? { kind: "damageDealt", target, percent: num(m[2]!), damageType: "any" }
      : { kind: "unparsed", text: f };
  },
  (f) => {
    const m = /^Dano mágico ([+-]?\d+)% contra (.+)$/i.exec(f);
    if (!m) return null;
    const target = resolveDamageTarget(m[2]!);
    return target
      ? {
          kind: "damageDealt",
          target,
          percent: num(m[1]!),
          damageType: "magical",
        }
      : { kind: "unparsed", text: f };
  },
  (f) => {
    // Genérico "Dano <Elemento|Sem-Forma> +1%" (bônus de compêndio).
    const m = /^Dano (.+?) ([+-]?\d+)%$/i.exec(f);
    if (!m) return null;
    const target = resolveDamageTarget(m[1]!);
    return target
      ? { kind: "damageDealt", target, percent: num(m[2]!), damageType: "any" }
      : { kind: "unparsed", text: f };
  },

  // ---- dano recebido ----------------------------------------------
  (f) => {
    const m = /^Redução de todo dano elemental ([+-]?\d+)%$/i.exec(f);
    return m
      ? {
          kind: "damageTaken",
          source: { scope: "allElemental" },
          percent: num(m[1]!),
        }
      : null;
  },
  (f) => {
    const m = /^Redução de dano de (.+?) ([+-]?\d+)%$/i.exec(f);
    if (!m) return null;
    const target = resolveDamageTarget(m[1]!);
    return target
      ? { kind: "damageTaken", source: target, percent: num(m[2]!) }
      : { kind: "unparsed", text: f };
  },
  (f) => {
    // "Redução de Sombrio -8%" (forma curta).
    const m = /^Redução de (.+?) ([+-]?\d+)%$/i.exec(f);
    if (!m) return null;
    const target = resolveDamageTarget(m[1]!);
    return target
      ? { kind: "damageTaken", source: target, percent: num(m[2]!) }
      : { kind: "unparsed", text: f };
  },

  // ---- procs / reflect / imunidades -----------------------------
  (f) => {
    const m = /^Reflete ([+-]?\d+)% do dano recebido$/i.exec(f);
    return m ? { kind: "reflect", percent: num(m[1]!) } : null;
  },
  (f) => {
    const m = /^([+-]?\d+)% chance de anular dano crítico recebido$/i.exec(f);
    return m ? { kind: "negateCrit", chancePercent: num(m[1]!) } : null;
  },
  (f) => {
    const m = /^([+-]?\d+)% chance de (.+)$/i.exec(f);
    return m
      ? { kind: "proc", effect: m[2]!.trim(), chancePercent: num(m[1]!) }
      : null;
  },
  (f) => {
    const m = /^Imunidade a (.+)$/i.exec(f);
    return m ? { kind: "immunity", to: m[1]!.trim() } : null;
  },
];

/* -------------------------------------------------------------------------- */
/*  API pública                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Converte um texto de efeito de Selo (ex.: `mainEffect` ou `collectionBonus`)
 * numa lista de modificadores estruturados. Fragmentos são separados por vírgula.
 * Função pura.
 */
export function parseSealEffectText(text: string): SealModifier[] {
  if (!text.trim()) return [];
  const out: SealModifier[] = [];
  for (const rawFragment of text.split(",")) {
    const fragment = rawFragment.trim();
    if (!fragment) continue;
    let matched: SealModifier | SealModifier[] | null = null;
    for (const matcher of MATCHERS) {
      matched = matcher(fragment);
      if (matched) break;
    }
    if (!matched) {
      out.push({ kind: "unparsed", text: fragment });
    } else if (Array.isArray(matched)) {
      out.push(...matched);
    } else {
      out.push(matched);
    }
  }
  return out;
}

/**
 * Modificadores do efeito principal de um Selo pelo id. Selo inexistente -> `[]`.
 * Função pura (lê apenas dados estáticos de `@game/data`).
 */
export function getSealMainModifiers(sealId: string): SealModifier[] {
  const seal = BATTLE_SEALS_BY_ID.get(sealId);
  return seal ? parseSealEffectText(seal.mainEffect) : [];
}

/** Modificadores do bônus de compêndio (coleção) de um Selo pelo id. */
export function getSealCollectionModifiers(sealId: string): SealModifier[] {
  const seal = BATTLE_SEALS_BY_ID.get(sealId);
  return seal ? parseSealEffectText(seal.collectionBonus) : [];
}

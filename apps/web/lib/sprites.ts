/**
 * Camada de apresentação da cena de combate — placeholders originais.
 *
 * NENHUMA arte real aqui. Enquanto não há sprites, cada combatente é desenhado
 * como uma FORMA + COR simples (SVG/CSS):
 *   - monstro    → círculo, cor por RAÇA
 *   - personagem → cápsula arredondada, cor por LINHA DE CLASSE
 *   - companheiro→ losango, cor por TIER
 * Um pequeno glifo (emoji do sistema — não é asset do projeto) vai dentro só
 * para leitura rápida.
 *
 * Quando a arte existir, `SpriteFigure` carrega a imagem real e este arquivo
 * só serve de fallback. Ver `public/sprites/README.md`.
 */

import type {
  ClassLine,
  CompanionTier,
  MonsterElement,
  MonsterRace,
} from "@game/data";

/* -------------------------------------------------------------------------- */
/*  Convenção de caminho dos sprites reais                                     */
/* -------------------------------------------------------------------------- */

export type SpriteKind = "character" | "monster" | "companion";

const SPRITE_DIR: Record<SpriteKind, string> = {
  character: "/sprites/characters",
  monster: "/sprites/monsters",
  companion: "/sprites/companions",
};

/** Caminho padrão de um sprite: `/sprites/<pasta>/<id>.png`. */
export function spritePath(kind: SpriteKind, id: string): string {
  return `${SPRITE_DIR[kind]}/${id}.png`;
}

/* -------------------------------------------------------------------------- */
/*  Cores dos placeholders                                                     */
/* -------------------------------------------------------------------------- */

/** Cor do placeholder do monstro, por raça (tabela raça→cor). */
export const RACE_PLACEHOLDER_COLOR: Record<MonsterRace, string> = {
  Planta: "#4ade80", // verde
  Bruto: "#b45309", // castanho-alaranjado
  Inseto: "#92400e", // marrom
  Anfíbio: "#2dd4bf", // verde-água
  Amorfo: "#67e8f9", // ciano claro (gosma)
  "Morto-vivo": "#9ca3af", // cinza
  Demônio: "#a855f7", // roxo
  Peixe: "#3b82f6", // azul
  Dragão: "#ef4444", // vermelho
};

/** Cor do placeholder do personagem, por linha de classe. */
export const CLASS_PLACEHOLDER_COLOR: Record<ClassLine, string> = {
  Guerreiro: "#dc2626",
  Arcanista: "#2563eb",
  Caçador: "#16a34a",
  Infiltrador: "#7c3aed",
  Mercador: "#d97706",
  Acólito: "#ca8a04",
};

/** Cor do placeholder do companheiro, por tier. */
export const COMPANION_PLACEHOLDER_COLOR: Record<CompanionTier, string> = {
  S: "#f59e0b",
  A: "#a855f7",
  B: "#3b82f6",
  C: "#9ca3af",
};

export function racePlaceholderColor(race: MonsterRace): string {
  return RACE_PLACEHOLDER_COLOR[race] ?? "#9ca3af";
}
export function classPlaceholderColor(line: ClassLine | undefined): string {
  return line ? (CLASS_PLACEHOLDER_COLOR[line] ?? "#64748b") : "#64748b";
}
export function companionPlaceholderColor(tier: CompanionTier): string {
  return COMPANION_PLACEHOLDER_COLOR[tier] ?? "#9ca3af";
}

/* -------------------------------------------------------------------------- */
/*  Glifos (emoji do sistema — legibilidade, não são arte do projeto)         */
/* -------------------------------------------------------------------------- */

const RACE_GLYPH: Record<MonsterRace, string> = {
  Planta: "🌿",
  Bruto: "🐗",
  Inseto: "🐛",
  Anfíbio: "🐸",
  Amorfo: "🫧",
  "Morto-vivo": "💀",
  Demônio: "😈",
  Peixe: "🐟",
  Dragão: "🐉",
};

const CLASS_GLYPH: Record<ClassLine, string> = {
  Guerreiro: "🛡️",
  Arcanista: "🔮",
  Caçador: "🏹",
  Infiltrador: "🗡️",
  Mercador: "⚙️",
  Acólito: "✨",
};

export function raceGlyph(race: MonsterRace): string {
  return RACE_GLYPH[race] ?? "❓";
}
export function classGlyph(line: ClassLine | undefined): string {
  return line ? (CLASS_GLYPH[line] ?? "🙂") : "🙂";
}
/** Companheiro: a letra do tier já comunica bem. */
export function companionGlyph(tier: CompanionTier): string {
  return tier;
}

/* -------------------------------------------------------------------------- */
/*  Cenário por capítulo                                                       */
/* -------------------------------------------------------------------------- */

const ELEMENT_COLOR: Record<MonsterElement, string> = {
  Neutro: "#9ca3af",
  Água: "#38bdf8",
  Terra: "#b45309",
  Vento: "#4ade80",
  Fogo: "#f97316",
  Sombrio: "#7c3aed",
  Fantasma: "#22d3ee",
};

/** Cor da aura elemental atrás do monstro. */
export function elementColor(element: MonsterElement): string {
  return ELEMENT_COLOR[element] ?? "#9ca3af";
}

/** Tom de cada capítulo, usado no brilho de fundo da arena. */
const CHAPTER_TINT: Record<number, string> = {
  1: "#4ade80", // campos
  2: "#64748b", // esgotos
  3: "#22c55e", // floresta
  4: "#a855f7", // torre arcana
  5: "#2dd4bf", // colinas
  6: "#71717a", // caverna
  7: "#f59e0b", // dunas
  8: "#eab308", // pirâmide
  9: "#38bdf8", // costa
  10: "#6366f1", // navio
};

/**
 * Fundo da arena: palco escuro com um brilho colorido no topo por capítulo.
 * Placeholder — troque por uma imagem em `sprites/` (ver README) quando houver.
 */
export function arenaBackground(chapterNumber: number): string {
  const tint = CHAPTER_TINT[chapterNumber] ?? "#64748b";
  return (
    `radial-gradient(130% 80% at 50% -10%, ${tint}55, transparent 55%),` +
    "linear-gradient(180deg, #0b1220 0%, #111c31 55%, #0b1220 100%)"
  );
}

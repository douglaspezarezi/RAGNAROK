/**
 * Camada de apresentação: "sprites" placeholder (emoji) e temas de cenário.
 *
 * Nada de arte final aqui — só o suficiente para a cena de batalha ter cara de
 * jogo. Trocar por spritesheets/arte depois é só mexer neste arquivo.
 */

import type { ClassLine, Monster, MonsterElement, MonsterRace } from "@game/data";

/** Emoji do herói pela linha de classe. */
export function heroSprite(line: ClassLine | undefined): string {
  switch (line) {
    case "Guerreiro":
      return "🤺";
    case "Arcanista":
      return "🧙";
    case "Caçador":
      return "🏹";
    case "Infiltrador":
      return "🥷";
    case "Mercador":
      return "🧑‍🔧";
    case "Acólito":
      return "🧑‍⚕️";
    default:
      return "🧑";
  }
}

const RACE_EMOJI: Record<MonsterRace, string> = {
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

/** Emoji do monstro pela raça. */
export function monsterSprite(monster: Monster): string {
  return RACE_EMOJI[monster.race] ?? "❓";
}

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

/** Fundo da arena: palco escuro com um brilho colorido no topo por capítulo. */
export function arenaBackground(chapterNumber: number): string {
  const tint = CHAPTER_TINT[chapterNumber] ?? "#64748b";
  return (
    `radial-gradient(130% 80% at 50% -10%, ${tint}55, transparent 55%),` +
    "linear-gradient(180deg, #0b1220 0%, #111c31 55%, #0b1220 100%)"
  );
}

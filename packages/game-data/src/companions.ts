/**
 * Companheiros (Pets) — os 4 tiers de raridade (GDD seção 7).
 *
 * Cada Companheiro tem um papel de combate fixo. As mecânicas de evolução,
 * invocação, vínculo e slots ativos (GDD 7.1) são lógica de jogo e não vivem aqui.
 */

import type { Companion } from "./types";

export const COMPANIONS = [
  /* ---------------- Tier S — Lendários (Endgame / PvP) --------------- */
  {
    id: "vendaval", name: "Vendaval", tier: "S", role: "DPS em Área (AoE)",
    description:
      "Rei do dano em área; essencial para limpar hordas e acelerar o farm diário. Na evolução máxima, seus ataques encadeiam entre múltiplos alvos.",
  },
  {
    id: "espirito-de-bronze", name: "Espírito de Bronze", tier: "S", role: "DPS Físico",
    description:
      "Excelente dano físico sustentado; conforme evolui, passa a transferir uma % do próprio ataque diretamente para o personagem.",
  },
  {
    id: "lamina-fantasma", name: "Lâmina Fantasma", tier: "S", role: "DPS Crítico (Single-Target)",
    description:
      "Focado em crítico e dano massivo contra um único alvo — a melhor opção para chefes e MVPs.",
  },
  {
    id: "guardiao-de-pedra", name: "Guardião de Pedra", tier: "S", role: "Tanque",
    description:
      "O melhor tanque lendário: absorve dano direcionado ao jogador e cria escudos de proteção periódicos.",
  },

  /* --------------------- Tier A — Avançados ------------------------- */
  {
    id: "coruja-sabia", name: "Coruja Sábia", tier: "A", role: "Suporte",
    description:
      "Um dos melhores suportes do jogo: fornece buffs de atributo e escudos utilitários ao grupo.",
  },
  {
    id: "fera-das-brumas", name: "Fera das Brumas", tier: "A", role: "DPS Físico",
    description: "Dano físico consistente com chance de sangramento acumulativo.",
  },
  {
    id: "choque-de-safira", name: "Choque de Safira", tier: "A", role: "DPS Mágico em Área",
    description:
      "Dano elemental de água em área, forte contra grupos de monstros terrestres.",
  },
  {
    id: "escamas-de-ferro", name: "Escamas de Ferro", tier: "A", role: "Tanque Secundário",
    description:
      "Boa opção de tanque intermediário, com redução fixa de dano físico recebido.",
  },

  /* --- Tier B — Intermediários (bom custo-benefício para iniciantes/F2P) --- */
  {
    id: "slime-veloz", name: "Slime Veloz", tier: "B", role: "Suporte de Combate",
    description:
      "Concede bônus de velocidade de ataque (ASPD) e roubo de vida (lifesteal).",
  },
  {
    id: "filhote-de-pedra", name: "Filhote de Pedra / Porco Real", tier: "B", role: "Tanque",
    aka: "Porco Real",
    description:
      "Cria um vínculo com o jogador e absorve dano letal, sacrificando-se para mantê-lo vivo.",
  },
  {
    id: "mascara-sorridente", name: "Máscara Sorridente", tier: "B", role: "Suporte de Cura",
    description: "Aplica cura ao personagem com base no dano causado em combate.",
  },
  {
    id: "sombra-aquatica", name: "Sombra Aquática", tier: "B", role: "Utilidade",
    description:
      "Focado em utilidade e sobrevivência nas sombras — reduz chance de ser alvo de investidas de monstros.",
  },

  /* ---------- Tier C — Iniciais (obtidos logo no começo do jogo) ---------- */
  {
    id: "coelhal-bebe", name: "Coelhal Bebê", tier: "C", role: "Suporte Básico",
    description:
      "Pequeno bônus de esquiva e sorte — o primeiro companheiro que todo jogador recebe.",
  },
  {
    id: "broteiro-domesticado", name: "Broteiro Domesticado", tier: "C", role: "Tanque Básico",
    description: "Bônus simples de HP máximo e defesa.",
  },
  {
    id: "gotinha-de-estimacao", name: "Gotinha de Estimação", tier: "C", role: "Suporte Mágico Básico",
    description: "Bônus simples de SP máximo e regeneração.",
  },
] as const satisfies readonly Companion[];

/** União de todos os `id`s de Companheiro. */
export type CompanionId = (typeof COMPANIONS)[number]["id"];

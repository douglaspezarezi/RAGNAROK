/**
 * Árvore de Classes — as 6 linhas, cada uma com 2 caminhos até o Job 4 (GDD seção 4).
 *
 * Modelagem: cada job é uma entrada {@link JobClass} ligada ao anterior por
 * `previousJobId`. O Job 1 (tier 1) é a raiz compartilhada da linha (`path: null`).
 * O GDD descreve `attributeFocus`, `playstyle` e `signatureSkills` por *caminho*
 * (não por tier), portanto os tiers 2–4 de um mesmo caminho repetem esses campos.
 */

import type { JobClass } from "./types";

export const JOBS = [
  /* ===================== Linha do Guerreiro ===================== */
  {
    id: "recruta", name: "Recruta", line: "Guerreiro", tier: 1, path: null,
    previousJobId: null, attributeFocus: [],
    playstyle: "Combate corpo a corpo, linha de frente.",
    signatureSkills: [],
  },
  // Caminho A — Recruta ➔ Sentinela ➔ Vanguarda ➔ Marechal de Aço
  {
    id: "sentinela", name: "Sentinela", line: "Guerreiro", tier: 2, path: "A",
    previousJobId: "recruta", attributeFocus: ["FOR", "VIT"],
    playstyle: "Tanque ofensivo, dano físico massivo em área, quebra de armadura inimiga.",
    signatureSkills: [
      { name: "Golpe Sísmico", description: "Dano em área + atordoamento." },
      { name: "Postura Inabalável", description: "Redução de dano por tempo limitado." },
    ],
  },
  {
    id: "vanguarda", name: "Vanguarda", line: "Guerreiro", tier: 3, path: "A",
    previousJobId: "sentinela", attributeFocus: ["FOR", "VIT"],
    playstyle: "Tanque ofensivo, dano físico massivo em área, quebra de armadura inimiga.",
    signatureSkills: [
      { name: "Golpe Sísmico", description: "Dano em área + atordoamento." },
      { name: "Postura Inabalável", description: "Redução de dano por tempo limitado." },
    ],
  },
  {
    id: "marechal-de-aco", name: "Marechal de Aço", line: "Guerreiro", tier: 4, path: "A",
    previousJobId: "vanguarda", attributeFocus: ["FOR", "VIT"],
    playstyle: "Tanque ofensivo, dano físico massivo em área, quebra de armadura inimiga.",
    signatureSkills: [
      { name: "Golpe Sísmico", description: "Dano em área + atordoamento." },
      { name: "Postura Inabalável", description: "Redução de dano por tempo limitado." },
    ],
  },
  // Caminho B — Recruta ➔ Corsário de Lâmina ➔ Dançarino de Lâminas ➔ Tempestade Carmesim
  {
    id: "corsario-de-lamina", name: "Corsário de Lâmina", line: "Guerreiro", tier: 2, path: "B",
    previousJobId: "recruta", attributeFocus: ["AGI"],
    playstyle: "DPS físico ágil, combos rápidos e esquiva.",
    signatureSkills: [
      { name: "Dança das Lâminas", description: "Multi-hit crescente." },
      { name: "Sombra Veloz", description: "Esquiva + contra-ataque." },
    ],
  },
  {
    id: "dancarino-de-laminas", name: "Dançarino de Lâminas", line: "Guerreiro", tier: 3, path: "B",
    previousJobId: "corsario-de-lamina", attributeFocus: ["AGI"],
    playstyle: "DPS físico ágil, combos rápidos e esquiva.",
    signatureSkills: [
      { name: "Dança das Lâminas", description: "Multi-hit crescente." },
      { name: "Sombra Veloz", description: "Esquiva + contra-ataque." },
    ],
  },
  {
    id: "tempestade-carmesim", name: "Tempestade Carmesim", line: "Guerreiro", tier: 4, path: "B",
    previousJobId: "dancarino-de-laminas", attributeFocus: ["AGI"],
    playstyle: "DPS físico ágil, combos rápidos e esquiva.",
    signatureSkills: [
      { name: "Dança das Lâminas", description: "Multi-hit crescente." },
      { name: "Sombra Veloz", description: "Esquiva + contra-ataque." },
    ],
  },

  /* ===================== Linha do Arcanista ===================== */
  {
    id: "aprendiz", name: "Aprendiz", line: "Arcanista", tier: 1, path: null,
    previousJobId: null, attributeFocus: [],
    playstyle: "Dano mágico à distância.",
    signatureSkills: [],
  },
  // Caminho A — Aprendiz ➔ Piromante ➔ Arquimago Ígneo ➔ Senhor das Chamas Eternas
  {
    id: "piromante", name: "Piromante", line: "Arcanista", tier: 2, path: "A",
    previousJobId: "aprendiz", attributeFocus: ["INT"],
    playstyle: "Dano em área de altíssimo burst, forte contra grupos.",
    signatureSkills: [
      { name: "Chuva de Meteoros", description: "AoE de fogo." },
      { name: "Combustão", description: "Dano contínuo escalável." },
    ],
  },
  {
    id: "arquimago-igneo", name: "Arquimago Ígneo", line: "Arcanista", tier: 3, path: "A",
    previousJobId: "piromante", attributeFocus: ["INT"],
    playstyle: "Dano em área de altíssimo burst, forte contra grupos.",
    signatureSkills: [
      { name: "Chuva de Meteoros", description: "AoE de fogo." },
      { name: "Combustão", description: "Dano contínuo escalável." },
    ],
  },
  {
    id: "senhor-das-chamas-eternas", name: "Senhor das Chamas Eternas", line: "Arcanista", tier: 4, path: "A",
    previousJobId: "arquimago-igneo", attributeFocus: ["INT"],
    playstyle: "Dano em área de altíssimo burst, forte contra grupos.",
    signatureSkills: [
      { name: "Chuva de Meteoros", description: "AoE de fogo." },
      { name: "Combustão", description: "Dano contínuo escalável." },
    ],
  },
  // Caminho B — Aprendiz ➔ Cronomante ➔ Tecelão do Tempo ➔ Guardião das Eras
  {
    id: "cronomante", name: "Cronomante", line: "Arcanista", tier: 2, path: "B",
    previousJobId: "aprendiz", attributeFocus: ["INT", "DES"],
    playstyle: "Suporte de grupo e controle de campo (lentidão, stun, aceleração de aliados).",
    signatureSkills: [
      { name: "Dilatação Temporal", description: "Buff de velocidade em grupo." },
      { name: "Congelar Instante", description: "Controle em área." },
    ],
  },
  {
    id: "tecelao-do-tempo", name: "Tecelão do Tempo", line: "Arcanista", tier: 3, path: "B",
    previousJobId: "cronomante", attributeFocus: ["INT", "DES"],
    playstyle: "Suporte de grupo e controle de campo (lentidão, stun, aceleração de aliados).",
    signatureSkills: [
      { name: "Dilatação Temporal", description: "Buff de velocidade em grupo." },
      { name: "Congelar Instante", description: "Controle em área." },
    ],
  },
  {
    id: "guardiao-das-eras", name: "Guardião das Eras", line: "Arcanista", tier: 4, path: "B",
    previousJobId: "tecelao-do-tempo", attributeFocus: ["INT", "DES"],
    playstyle: "Suporte de grupo e controle de campo (lentidão, stun, aceleração de aliados).",
    signatureSkills: [
      { name: "Dilatação Temporal", description: "Buff de velocidade em grupo." },
      { name: "Congelar Instante", description: "Controle em área." },
    ],
  },

  /* ===================== Linha do Caçador ====================== */
  {
    id: "batedor", name: "Batedor", line: "Caçador", tier: 1, path: null,
    previousJobId: null, attributeFocus: [],
    playstyle: "Dano físico à distância, DPS sustentado.",
    signatureSkills: [],
  },
  // Caminho A — Batedor ➔ Flecheiro ➔ Atirador de Elite ➔ Predador Silencioso
  {
    id: "flecheiro", name: "Flecheiro", line: "Caçador", tier: 2, path: "A",
    previousJobId: "batedor", attributeFocus: ["DES"],
    playstyle: "Dano single-target altíssimo, ideal contra chefes.",
    signatureSkills: [
      { name: "Tiro Perfurante", description: "Dano crítico garantido." },
      { name: "Foco Predatório", description: "Bônus de dano crescente por acerto." },
    ],
  },
  {
    id: "atirador-de-elite", name: "Atirador de Elite", line: "Caçador", tier: 3, path: "A",
    previousJobId: "flecheiro", attributeFocus: ["DES"],
    playstyle: "Dano single-target altíssimo, ideal contra chefes.",
    signatureSkills: [
      { name: "Tiro Perfurante", description: "Dano crítico garantido." },
      { name: "Foco Predatório", description: "Bônus de dano crescente por acerto." },
    ],
  },
  {
    id: "predador-silencioso", name: "Predador Silencioso", line: "Caçador", tier: 4, path: "A",
    previousJobId: "atirador-de-elite", attributeFocus: ["DES"],
    playstyle: "Dano single-target altíssimo, ideal contra chefes.",
    signatureSkills: [
      { name: "Tiro Perfurante", description: "Dano crítico garantido." },
      { name: "Foco Predatório", description: "Bônus de dano crescente por acerto." },
    ],
  },
  // Caminho B — Batedor ➔ Rastreador ➔ Mestre das Armadilhas ➔ Senhor da Caça
  {
    id: "rastreador", name: "Rastreador", line: "Caçador", tier: 2, path: "B",
    previousJobId: "batedor", attributeFocus: ["DES", "AGI"],
    playstyle: "Dano em área e debuffs via armadilhas, forte em farm de hordas.",
    signatureSkills: [
      { name: "Campo Minado", description: "Armadilhas em área." },
      { name: "Rede de Espinhos", description: "Imobilização em área." },
    ],
  },
  {
    id: "mestre-das-armadilhas", name: "Mestre das Armadilhas", line: "Caçador", tier: 3, path: "B",
    previousJobId: "rastreador", attributeFocus: ["DES", "AGI"],
    playstyle: "Dano em área e debuffs via armadilhas, forte em farm de hordas.",
    signatureSkills: [
      { name: "Campo Minado", description: "Armadilhas em área." },
      { name: "Rede de Espinhos", description: "Imobilização em área." },
    ],
  },
  {
    id: "senhor-da-caca", name: "Senhor da Caça", line: "Caçador", tier: 4, path: "B",
    previousJobId: "mestre-das-armadilhas", attributeFocus: ["DES", "AGI"],
    playstyle: "Dano em área e debuffs via armadilhas, forte em farm de hordas.",
    signatureSkills: [
      { name: "Campo Minado", description: "Armadilhas em área." },
      { name: "Rede de Espinhos", description: "Imobilização em área." },
    ],
  },

  /* ===================== Linha do Infiltrador ================== */
  {
    id: "ladino", name: "Ladino", line: "Infiltrador", tier: 1, path: null,
    previousJobId: null, attributeFocus: [],
    playstyle: "Crítico e dano de burst.",
    signatureSkills: [],
  },
  // Caminho A — Ladino ➔ Sombra ➔ Lâmina Silenciosa ➔ Executor das Trevas
  {
    id: "sombra", name: "Sombra", line: "Infiltrador", tier: 2, path: "A",
    previousJobId: "ladino", attributeFocus: ["SOR", "AGI"],
    playstyle: "Assassinato single-target, bônus de dano contra alvos com HP baixo.",
    signatureSkills: [
      { name: "Golpe Fatal", description: "Dano crítico massivo." },
      { name: "Execução Sombria", description: "Dano bônus abaixo de 30% HP do alvo." },
    ],
  },
  {
    id: "lamina-silenciosa", name: "Lâmina Silenciosa", line: "Infiltrador", tier: 3, path: "A",
    previousJobId: "sombra", attributeFocus: ["SOR", "AGI"],
    playstyle: "Assassinato single-target, bônus de dano contra alvos com HP baixo.",
    signatureSkills: [
      { name: "Golpe Fatal", description: "Dano crítico massivo." },
      { name: "Execução Sombria", description: "Dano bônus abaixo de 30% HP do alvo." },
    ],
  },
  {
    id: "executor-das-trevas", name: "Executor das Trevas", line: "Infiltrador", tier: 4, path: "A",
    previousJobId: "lamina-silenciosa", attributeFocus: ["SOR", "AGI"],
    playstyle: "Assassinato single-target, bônus de dano contra alvos com HP baixo.",
    signatureSkills: [
      { name: "Golpe Fatal", description: "Dano crítico massivo." },
      { name: "Execução Sombria", description: "Dano bônus abaixo de 30% HP do alvo." },
    ],
  },
  // Caminho B — Ladino ➔ Ilusionista ➔ Mestre dos Disfarces ➔ Véu do Caos
  {
    id: "ilusionista", name: "Ilusionista", line: "Infiltrador", tier: 2, path: "B",
    previousJobId: "ladino", attributeFocus: ["AGI", "INT"],
    playstyle: "Evasão alta, confusão e debuffs em área, suporte de controle.",
    signatureSkills: [
      { name: "Espelho Ilusório", description: "Clone que desvia ataques." },
      { name: "Névoa Mental", description: "Debuff de precisão em área." },
    ],
  },
  {
    id: "mestre-dos-disfarces", name: "Mestre dos Disfarces", line: "Infiltrador", tier: 3, path: "B",
    previousJobId: "ilusionista", attributeFocus: ["AGI", "INT"],
    playstyle: "Evasão alta, confusão e debuffs em área, suporte de controle.",
    signatureSkills: [
      { name: "Espelho Ilusório", description: "Clone que desvia ataques." },
      { name: "Névoa Mental", description: "Debuff de precisão em área." },
    ],
  },
  {
    id: "veu-do-caos", name: "Véu do Caos", line: "Infiltrador", tier: 4, path: "B",
    previousJobId: "mestre-dos-disfarces", attributeFocus: ["AGI", "INT"],
    playstyle: "Evasão alta, confusão e debuffs em área, suporte de controle.",
    signatureSkills: [
      { name: "Espelho Ilusório", description: "Clone que desvia ataques." },
      { name: "Névoa Mental", description: "Debuff de precisão em área." },
    ],
  },

  /* ===================== Linha do Mercador ==================== */
  {
    id: "negociante", name: "Negociante", line: "Mercador", tier: 1, path: null,
    previousJobId: null, attributeFocus: [],
    playstyle: "Suporte econômico e utilidade.",
    signatureSkills: [],
  },
  // Caminho A — Negociante ➔ Alquimista ➔ Mestre das Poções ➔ Grão-Alquimista
  {
    id: "alquimista", name: "Alquimista", line: "Mercador", tier: 2, path: "A",
    previousJobId: "negociante", attributeFocus: ["INT", "VIT"],
    playstyle: "Criação de itens, buffs de grupo e cura alternativa via poções.",
    signatureSkills: [
      { name: "Fervura Vital", description: "Cura em área." },
      { name: "Elixir de Fúria", description: "Buff de dano em grupo." },
    ],
  },
  {
    id: "mestre-das-pocoes", name: "Mestre das Poções", line: "Mercador", tier: 3, path: "A",
    previousJobId: "alquimista", attributeFocus: ["INT", "VIT"],
    playstyle: "Criação de itens, buffs de grupo e cura alternativa via poções.",
    signatureSkills: [
      { name: "Fervura Vital", description: "Cura em área." },
      { name: "Elixir de Fúria", description: "Buff de dano em grupo." },
    ],
  },
  {
    id: "grao-alquimista", name: "Grão-Alquimista", line: "Mercador", tier: 4, path: "A",
    previousJobId: "mestre-das-pocoes", attributeFocus: ["INT", "VIT"],
    playstyle: "Criação de itens, buffs de grupo e cura alternativa via poções.",
    signatureSkills: [
      { name: "Fervura Vital", description: "Cura em área." },
      { name: "Elixir de Fúria", description: "Buff de dano em grupo." },
    ],
  },
  // Caminho B — Negociante ➔ Artífice ➔ Engenheiro de Guerra ➔ Arquiteto de Autômatos
  {
    id: "artifice", name: "Artífice", line: "Mercador", tier: 2, path: "B",
    previousJobId: "negociante", attributeFocus: ["DES", "INT"],
    playstyle: "Invocação de constructos/torretas que lutam junto ao jogador, ótimo para farm automatizado (perfeito pro formato idle).",
    signatureSkills: [
      { name: "Torreta de Faísca", description: "Dano automático contínuo." },
      { name: "Autômato Guardião", description: "Invocação tanque." },
    ],
  },
  {
    id: "engenheiro-de-guerra", name: "Engenheiro de Guerra", line: "Mercador", tier: 3, path: "B",
    previousJobId: "artifice", attributeFocus: ["DES", "INT"],
    playstyle: "Invocação de constructos/torretas que lutam junto ao jogador, ótimo para farm automatizado (perfeito pro formato idle).",
    signatureSkills: [
      { name: "Torreta de Faísca", description: "Dano automático contínuo." },
      { name: "Autômato Guardião", description: "Invocação tanque." },
    ],
  },
  {
    id: "arquiteto-de-automatos", name: "Arquiteto de Autômatos", line: "Mercador", tier: 4, path: "B",
    previousJobId: "engenheiro-de-guerra", attributeFocus: ["DES", "INT"],
    playstyle: "Invocação de constructos/torretas que lutam junto ao jogador, ótimo para farm automatizado (perfeito pro formato idle).",
    signatureSkills: [
      { name: "Torreta de Faísca", description: "Dano automático contínuo." },
      { name: "Autômato Guardião", description: "Invocação tanque." },
    ],
  },

  /* ===================== Linha do Acólito ===================== */
  {
    id: "novico", name: "Noviço", line: "Acólito", tier: 1, path: null,
    previousJobId: null, attributeFocus: [],
    playstyle: "Cura e suporte.",
    signatureSkills: [],
  },
  // Caminho A — Noviço ➔ Clérigo ➔ Sacerdote ➔ Grão-Sacerdote
  {
    id: "clerigo", name: "Clérigo", line: "Acólito", tier: 2, path: "A",
    previousJobId: "novico", attributeFocus: ["INT"],
    playstyle: "Cura em área, ressurreição e buffs sagrados de grupo.",
    signatureSkills: [
      { name: "Luz Restauradora", description: "Cura em área contínua." },
      { name: "Bênção Maior", description: "Buff de todos os atributos do grupo." },
    ],
  },
  {
    id: "sacerdote", name: "Sacerdote", line: "Acólito", tier: 3, path: "A",
    previousJobId: "clerigo", attributeFocus: ["INT"],
    playstyle: "Cura em área, ressurreição e buffs sagrados de grupo.",
    signatureSkills: [
      { name: "Luz Restauradora", description: "Cura em área contínua." },
      { name: "Bênção Maior", description: "Buff de todos os atributos do grupo." },
    ],
  },
  {
    id: "grao-sacerdote", name: "Grão-Sacerdote", line: "Acólito", tier: 4, path: "A",
    previousJobId: "sacerdote", attributeFocus: ["INT"],
    playstyle: "Cura em área, ressurreição e buffs sagrados de grupo.",
    signatureSkills: [
      { name: "Luz Restauradora", description: "Cura em área contínua." },
      { name: "Bênção Maior", description: "Buff de todos os atributos do grupo." },
    ],
  },
  // Caminho B — Noviço ➔ Monge ➔ Mestre Marcial ➔ Avatar Espiritual
  {
    id: "monge", name: "Monge", line: "Acólito", tier: 2, path: "B",
    previousJobId: "novico", attributeFocus: ["FOR", "VIT"],
    playstyle: "Combate corpo a corpo com técnicas espirituais e auto-cura, ótimo como sub-tanque.",
    signatureSkills: [
      { name: "Punho do Vazio", description: "Dano físico + cura própria." },
      { name: "Respiração Ancestral", description: "Regeneração contínua de HP/SP." },
    ],
  },
  {
    id: "mestre-marcial", name: "Mestre Marcial", line: "Acólito", tier: 3, path: "B",
    previousJobId: "monge", attributeFocus: ["FOR", "VIT"],
    playstyle: "Combate corpo a corpo com técnicas espirituais e auto-cura, ótimo como sub-tanque.",
    signatureSkills: [
      { name: "Punho do Vazio", description: "Dano físico + cura própria." },
      { name: "Respiração Ancestral", description: "Regeneração contínua de HP/SP." },
    ],
  },
  {
    id: "avatar-espiritual", name: "Avatar Espiritual", line: "Acólito", tier: 4, path: "B",
    previousJobId: "mestre-marcial", attributeFocus: ["FOR", "VIT"],
    playstyle: "Combate corpo a corpo com técnicas espirituais e auto-cura, ótimo como sub-tanque.",
    signatureSkills: [
      { name: "Punho do Vazio", description: "Dano físico + cura própria." },
      { name: "Respiração Ancestral", description: "Regeneração contínua de HP/SP." },
    ],
  },
] as const satisfies readonly JobClass[];

/** União de todos os `id`s de job. */
export type JobId = (typeof JOBS)[number]["id"];

/** Somente os jobs base (Job 1) de cada linha. */
export const BASE_JOBS: readonly JobClass[] = JOBS.filter((j) => j.tier === 1);

/**
 * Selos de Batalha — as 7 categorias de equipamento (GDD seção 6.1–6.7).
 *
 * Cada Selo referencia o monstro de origem via `sourceMonsterId`. O tipo abaixo
 * força esse campo a ser um {@link MonsterId} válido, então qualquer id digitado
 * errado quebra o `typecheck`.
 */

import type { BattleSeal } from "./types";
import type { MonsterId } from "./bestiary";

/** `BattleSeal` com a referência ao bestiário verificada em tempo de compilação. */
type CheckedSeal = Omit<BattleSeal, "sourceMonsterId"> & { sourceMonsterId: MonsterId };

export const BATTLE_SEALS = [
  /* ---------------------- 6.1 Selos para Armas ------------------------- */
  {
    id: "selo-do-coelhal", name: "Selo do Coelhal", sourceMonsterId: "coelhal",
    equipmentSlot: "Arma", rarity: "Comum", sourceLevelRange: "Nv 1–20",
    mainEffect: "SOR +1, Crítico +1%, Esquiva +1", collectionBonus: "ATQ.M +2",
  },
  {
    id: "selo-do-filhotinho-selvagem", name: "Selo do Filhotinho Selvagem", sourceMonsterId: "filhotinho-selvagem",
    equipmentSlot: "Arma", rarity: "Comum", sourceLevelRange: "Nv 1–20",
    mainEffect: "ATQ +5, ATQ.M +5, 2% chance de Atordoar", collectionBonus: "HP Máx +20",
  },
  {
    id: "selo-da-aracnil", name: "Selo da Aracnil", sourceMonsterId: "aracnil",
    equipmentSlot: "Arma", rarity: "Incomum", sourceLevelRange: "Nv 21–40",
    mainEffect: "AGI +1, Esquiva +1, ATQ +5", collectionBonus: "HP Máx +20",
  },
  {
    id: "selo-do-sussurro-da-copa", name: "Selo do Sussurro da Copa", sourceMonsterId: "sussurro-da-copa",
    equipmentSlot: "Arma", rarity: "Incomum", sourceLevelRange: "Nv 21–40",
    mainEffect: "ATQ +10, ATQ.M +10, 2% chance de Medo", collectionBonus: "ATQ +2",
  },
  {
    id: "selo-do-lobo-das-brumas", name: "Selo do Lobo das Brumas", sourceMonsterId: "lobo-das-brumas",
    equipmentSlot: "Arma", rarity: "Raro", sourceLevelRange: "Nv 41–60",
    mainEffect: "ATQ +15, Acerto +5", collectionBonus: "ATQ +2",
  },
  {
    id: "selo-da-aranha-do-sol", name: "Selo da Aranha-do-Sol", sourceMonsterId: "aranha-do-sol",
    equipmentSlot: "Arma", rarity: "Raro", sourceLevelRange: "Nv 61–90",
    mainEffect: "Dano contra elemento Fogo +20%", collectionBonus: "Dano Fogo +1%",
  },
  {
    id: "selo-do-golem-faiscante", name: "Selo do Golem Faiscante", sourceMonsterId: "golem-faiscante",
    equipmentSlot: "Arma", rarity: "Épico", sourceLevelRange: "Nv 55+",
    mainEffect: "Dano contra raça Amorfo +20%", collectionBonus: "Dano Sem-Forma +1%",
  },
  {
    id: "selo-do-capitao-amaldicoado", name: "Selo do Capitão Amaldiçoado", sourceMonsterId: "capitao-amaldicoado",
    equipmentSlot: "Arma", rarity: "Lendário", sourceLevelRange: "Nv 120+",
    mainEffect: "ATQ +40, 10% chance de Maldição", collectionBonus: "Dano vs. Morto-vivo +3%",
  },

  /* --------------------- 6.2 Selos para Armaduras --------------------- */
  {
    id: "selo-do-broteiro", name: "Selo do Broteiro", sourceMonsterId: "broteiro",
    equipmentSlot: "Armadura", rarity: "Comum", sourceLevelRange: "Nv 1–20",
    mainEffect: "VIT +2, HP Máx +250", collectionBonus: "DEF +2",
  },
  {
    id: "selo-da-salgueira", name: "Selo da Salgueira", sourceMonsterId: "salgueira",
    equipmentSlot: "Armadura", rarity: "Comum", sourceLevelRange: "Nv 1–20",
    mainEffect: "Redução de dano de Planta -5%", collectionBonus: "HP Máx +30",
  },
  {
    id: "selo-do-trilobite-cavernoso", name: "Selo do Trilobite Cavernoso", sourceMonsterId: "trilobite-cavernoso",
    equipmentSlot: "Armadura", rarity: "Incomum", sourceLevelRange: "Nv 21–40",
    mainEffect: "Redução de dano de Água -5%", collectionBonus: "DEF +3",
  },
  {
    id: "selo-do-urso-espinho", name: "Selo do Urso-Espinho", sourceMonsterId: "urso-espinho",
    equipmentSlot: "Armadura", rarity: "Raro", sourceLevelRange: "Nv 41–60",
    mainEffect: "HP Máx +8%, VIT +5", collectionBonus: "DEF +5",
  },
  {
    id: "selo-do-guerreiro-caido", name: "Selo do Guerreiro Caído", sourceMonsterId: "guerreiro-caido",
    equipmentSlot: "Armadura", rarity: "Raro", sourceLevelRange: "Nv 61–90",
    mainEffect: "Redução de dano de Morto-vivo -10%", collectionBonus: "HP Máx +5%",
  },
  {
    id: "selo-do-guardiao-de-sarcofago", name: "Selo do Guardião de Sarcófago", sourceMonsterId: "guardiao-de-sarcofago",
    equipmentSlot: "Armadura", rarity: "Épico", sourceLevelRange: "Nv 85–110",
    mainEffect: "HP Máx +12%, Redução de Sombrio -8%", collectionBonus: "DEF +10",
  },
  {
    id: "selo-do-capitao-sem-nome", name: "Selo do Capitão Sem-Nome", sourceMonsterId: "capitao-sem-nome",
    equipmentSlot: "Armadura", rarity: "Lendário", sourceLevelRange: "Nv 120+",
    mainEffect: "HP Máx +15%, Imunidade a Medo", collectionBonus: "DEF +15",
  },

  /* ---------------------- 6.3 Selos para Escudos --------------------- */
  {
    id: "selo-do-casulim", name: "Selo do Casulim", sourceMonsterId: "casulim",
    equipmentSlot: "Escudo", rarity: "Comum", sourceLevelRange: "Nv 1–20",
    mainEffect: "Bloqueio +3%", collectionBonus: "DEF +2",
  },
  {
    id: "selo-do-rolante", name: "Selo do Rolante", sourceMonsterId: "rolante",
    equipmentSlot: "Escudo", rarity: "Incomum", sourceLevelRange: "Nv 21–40",
    mainEffect: "Redução de dano de Inseto -8%", collectionBonus: "Bloqueio +2%",
  },
  {
    id: "selo-da-pantera-sombria", name: "Selo da Pantera Sombria", sourceMonsterId: "pantera-sombria",
    equipmentSlot: "Escudo", rarity: "Raro", sourceLevelRange: "Nv 41–60",
    mainEffect: "Redução de dano de Sombrio -10%", collectionBonus: "Bloqueio +3%",
  },
  {
    id: "selo-do-carrasco-enferrujado", name: "Selo do Carrasco Enferrujado", sourceMonsterId: "carrasco-enferrujado",
    equipmentSlot: "Escudo", rarity: "Épico", sourceLevelRange: "Nv 61–90",
    mainEffect: "Reflete 5% do dano recebido", collectionBonus: "DEF +8",
  },
  {
    id: "selo-do-colosso-de-areia", name: "Selo do Colosso de Areia", sourceMonsterId: "colosso-de-areia",
    equipmentSlot: "Escudo", rarity: "Épico", sourceLevelRange: "Nv 70–90",
    mainEffect: "Redução de dano de Terra -12%", collectionBonus: "Bloqueio +4%",
  },
  {
    id: "selo-do-sino-assombrado", name: "Selo do Sino Assombrado", sourceMonsterId: "sino-assombrado",
    equipmentSlot: "Escudo", rarity: "Lendário", sourceLevelRange: "Nv 120+",
    mainEffect: "15% chance de anular dano crítico recebido", collectionBonus: "DEF +12",
  },

  /* ----------------------- 6.4 Selos para Capas --------------------- */
  {
    id: "selo-do-vento-zune", name: "Selo do Vento-Zune", sourceMonsterId: "vento-zune",
    equipmentSlot: "Capa", rarity: "Comum", sourceLevelRange: "Nv 1–20",
    mainEffect: "Esquiva +3 contra Inseto", collectionBonus: "Esquiva +1",
  },
  {
    id: "selo-do-aerofel", name: "Selo do Aerofel", sourceMonsterId: "aerofel",
    equipmentSlot: "Capa", rarity: "Incomum", sourceLevelRange: "Nv 21–40",
    mainEffect: "Esquiva +5 contra Bruto", collectionBonus: "Esquiva +2",
  },
  {
    id: "selo-do-falcao-de-granito", name: "Selo do Falcão de Granito", sourceMonsterId: "falcao-de-granito",
    equipmentSlot: "Capa", rarity: "Raro", sourceLevelRange: "Nv 41–60",
    mainEffect: "Redução de dano de Vento -10%", collectionBonus: "Esquiva +3",
  },
  {
    id: "selo-do-corvo-necrofago", name: "Selo do Corvo Necrófago", sourceMonsterId: "corvo-necrofago",
    equipmentSlot: "Capa", rarity: "Raro", sourceLevelRange: "Nv 61–90",
    mainEffect: "Esquiva +8 contra Morto-vivo", collectionBonus: "Esquiva +3",
  },
  {
    id: "selo-do-espectro-dourado", name: "Selo do Espectro Dourado", sourceMonsterId: "espectro-dourado",
    equipmentSlot: "Capa", rarity: "Épico", sourceLevelRange: "Nv 85–110",
    mainEffect: "Redução de dano de Fantasma -12%", collectionBonus: "Esquiva +5",
  },
  {
    id: "selo-da-serpente-das-profundezas", name: "Selo da Serpente das Profundezas", sourceMonsterId: "serpente-das-profundezas",
    equipmentSlot: "Capa", rarity: "Lendário", sourceLevelRange: "Nv 140+",
    mainEffect: "Redução de todo dano elemental -5%", collectionBonus: "Esquiva +8",
  },

  /* --------------------- 6.5 Selos para Sapatos -------------------- */
  {
    id: "selo-da-larva-luminosa", name: "Selo da Larva Luminosa", sourceMonsterId: "larva-luminosa",
    equipmentSlot: "Sapato", rarity: "Comum", sourceLevelRange: "Nv 1–20",
    mainEffect: "ASPD +2%", collectionBonus: "Velocidade de Movimento +2%",
  },
  {
    id: "selo-do-fungo-rastejante", name: "Selo do Fungo Rastejante", sourceMonsterId: "fungo-rastejante",
    equipmentSlot: "Sapato", rarity: "Incomum", sourceLevelRange: "Nv 21–40",
    mainEffect: "ASPD +4%, SP regen +1", collectionBonus: "Velocidade +3%",
  },
  {
    id: "selo-da-coruja-arcana", name: "Selo da Coruja Arcana", sourceMonsterId: "coruja-arcana",
    equipmentSlot: "Sapato", rarity: "Raro", sourceLevelRange: "Nv 41–60",
    mainEffect: "ASPD +6%, redução de tempo de conjuração -3%", collectionBonus: "Velocidade +4%",
  },
  {
    id: "selo-do-escaravelho-blindado", name: "Selo do Escaravelho Blindado", sourceMonsterId: "escaravelho-blindado",
    equipmentSlot: "Sapato", rarity: "Raro", sourceLevelRange: "Nv 61–90",
    mainEffect: "ASPD +8%", collectionBonus: "Velocidade +5%",
  },
  {
    id: "selo-da-mumia-selada", name: "Selo da Múmia Selada", sourceMonsterId: "mumia-selada",
    equipmentSlot: "Sapato", rarity: "Épico", sourceLevelRange: "Nv 85–110",
    mainEffect: "Imunidade a Lentidão", collectionBonus: "ASPD +5%",
  },
  {
    id: "selo-do-marujo-amaldicoado", name: "Selo do Marujo Amaldiçoado", sourceMonsterId: "marujo-amaldicoado",
    equipmentSlot: "Sapato", rarity: "Lendário", sourceLevelRange: "Nv 120+",
    mainEffect: "ASPD +12%, Velocidade +10%", collectionBonus: "Velocidade +8%",
  },

  /* -------------------- 6.6 Selos para Acessórios ----------------- */
  {
    id: "selo-da-gotinha", name: "Selo da Gotinha", sourceMonsterId: "gotinha",
    equipmentSlot: "Acessório", rarity: "Comum", sourceLevelRange: "Nv 1–20",
    mainEffect: "SP Máx +5%", collectionBonus: "INT +1",
  },
  {
    id: "selo-do-sapo-de-poca", name: "Selo do Sapo-de-Poça", sourceMonsterId: "sapo-de-poca",
    equipmentSlot: "Acessório", rarity: "Incomum", sourceLevelRange: "Nv 21–40",
    mainEffect: "Redução de tempo de conjuração fixo -5%", collectionBonus: "INT +2",
  },
  {
    id: "selo-do-grimorio-vivo", name: "Selo do Grimório Vivo", sourceMonsterId: "grimorio-vivo",
    equipmentSlot: "Acessório", rarity: "Raro", sourceLevelRange: "Nv 41–60",
    mainEffect: "ATQ.M +8%, SP Máx +5%", collectionBonus: "INT +3",
  },
  {
    id: "selo-da-chama-perdida", name: "Selo da Chama Perdida", sourceMonsterId: "chama-perdida",
    equipmentSlot: "Acessório", rarity: "Épico", sourceLevelRange: "Nv 40–60",
    mainEffect: "Dano mágico +10% contra Demônio", collectionBonus: "ATQ.M +5%",
  },
  {
    id: "selo-do-djinn-menor", name: "Selo do Djinn Menor", sourceMonsterId: "djinn-menor",
    equipmentSlot: "Acessório", rarity: "Épico", sourceLevelRange: "Nv 70–90",
    mainEffect: "Chance de crítico mágico +5%", collectionBonus: "ATQ.M +6%",
  },
  {
    id: "selo-do-sacerdote-amaldicoado", name: "Selo do Sacerdote Amaldiçoado", sourceMonsterId: "sacerdote-amaldicoado",
    equipmentSlot: "Acessório", rarity: "Lendário", sourceLevelRange: "Nv 85–110",
    mainEffect: "Cura recebida +15%", collectionBonus: "SP Máx +10%",
  },

  /* --------- 6.7 Selos para Elmos (Equipamentos de Cabeça) ------- */
  {
    id: "selo-da-cavador-sombrio", name: "Selo da Cavador-Sombrio", sourceMonsterId: "cavador-sombrio",
    equipmentSlot: "Elmo", rarity: "Comum", sourceLevelRange: "Nv 1–20",
    mainEffect: "Percepção +3 (visão de itens raros)", collectionBonus: "DES +1",
  },
  {
    id: "selo-do-esporo-flutuante", name: "Selo do Esporo Flutuante", sourceMonsterId: "esporo-flutuante",
    equipmentSlot: "Elmo", rarity: "Incomum", sourceLevelRange: "Nv 21–40",
    mainEffect: "HP regen +2%/10s", collectionBonus: "VIT +2",
  },
  {
    id: "selo-do-espinho-vagante", name: "Selo do Espinho Vagante", sourceMonsterId: "espinho-vagante",
    equipmentSlot: "Elmo", rarity: "Raro", sourceLevelRange: "Nv 41–60",
    mainEffect: "Redução de dano de Planta -8%", collectionBonus: "DEF +3",
  },
  {
    id: "selo-da-ossada-errante", name: "Selo da Ossada Errante", sourceMonsterId: "ossada-errante",
    equipmentSlot: "Elmo", rarity: "Raro", sourceLevelRange: "Nv 61–90",
    mainEffect: "Redução de dano de Morto-vivo -8%", collectionBonus: "DEF +4",
  },
  {
    id: "selo-da-sereia-das-mares", name: "Selo da Sereia das Marés", sourceMonsterId: "sereia-das-mares",
    equipmentSlot: "Elmo", rarity: "Épico", sourceLevelRange: "Nv 100–130",
    mainEffect: "Redução de dano de Água -10%", collectionBonus: "HP Máx +6%",
  },
  {
    id: "selo-do-general-esquecido", name: "Selo do General Esquecido", sourceMonsterId: "general-esquecido",
    equipmentSlot: "Elmo", rarity: "Lendário", sourceLevelRange: "Nv 80+",
    mainEffect: "Todos os atributos +3", collectionBonus: "Todos os atributos +1",
  },
] as const satisfies readonly CheckedSeal[];

/** União de todos os `id`s de Selo. */
export type BattleSealId = (typeof BATTLE_SEALS)[number]["id"];

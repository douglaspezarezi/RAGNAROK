/**
 * Bestiário completo — todos os monstros das 10 regiões (GDD seção 5).
 *
 * Cada entrada segue a interface {@link Monster}. Os campos `element` e
 * `elementLevel` decompõem a coluna "Elemento" do GDD (ex.: "Água 2" ->
 * `element: "Água"`, `elementLevel: 2`). Monstros marcados como "(Mini)" ou
 * "(MVP)" têm `isBoss: true` e um `bossRank` correspondente.
 */

import type { Monster } from "./types";

export const CHAPTERS: readonly { number: number; name: string; levelRange: string }[] = [
  { number: 1, name: "Campos ao Redor de Aurelis", levelRange: "Nv. 1–20" },
  { number: 2, name: "Esgotos de Aurelis", levelRange: "Nv. 15–30" },
  { number: 3, name: "Florestas de Sylmere", levelRange: "Nv. 25–45" },
  { number: 4, name: "Torre Arcana", levelRange: "Nv. 40–60" },
  { number: 5, name: "Colinas de Kaeshin", levelRange: "Nv. 50–70" },
  { number: 6, name: "Caverna de Kaeshin", levelRange: "Nv. 60–80" },
  { number: 7, name: "Dunas de Zahkar", levelRange: "Nv. 70–90" },
  { number: 8, name: "Pirâmide Esquecida", levelRange: "Nv. 85–110" },
  { number: 9, name: "Costa de Ventomar", levelRange: "Nv. 100–130" },
  { number: 10, name: "Navio Naufragado", levelRange: "Nv. 120+" },
] as const;

export const MONSTERS = [
  /* ---- Capítulo 1 — Campos ao Redor de Aurelis (Nv. 1–20) ---------------- */
  { id: "gotinha", name: "Gotinha", level: 1, race: "Planta", element: "Água", elementLevel: 1, size: "Médio", chapter: "Campos ao Redor de Aurelis", chapterNumber: 1, isBoss: false },
  { id: "coelhal", name: "Coelhal", level: 1, race: "Bruto", element: "Neutro", elementLevel: 1, size: "Pequeno", chapter: "Campos ao Redor de Aurelis", chapterNumber: 1, isBoss: false },
  { id: "broteiro", name: "Broteiro", level: 2, race: "Inseto", element: "Terra", elementLevel: 1, size: "Pequeno", chapter: "Campos ao Redor de Aurelis", chapterNumber: 1, isBoss: false },
  { id: "casulim", name: "Casulim", level: 3, race: "Inseto", element: "Terra", elementLevel: 1, size: "Pequeno", chapter: "Campos ao Redor de Aurelis", chapterNumber: 1, isBoss: false },
  { id: "vento-zune", name: "Vento-Zune", level: 4, race: "Inseto", element: "Vento", elementLevel: 1, size: "Pequeno", chapter: "Campos ao Redor de Aurelis", chapterNumber: 1, isBoss: false },
  { id: "salgueira", name: "Salgueira", level: 6, race: "Planta", element: "Terra", elementLevel: 1, size: "Médio", chapter: "Campos ao Redor de Aurelis", chapterNumber: 1, isBoss: false },
  { id: "rolante", name: "Rolante", level: 8, race: "Inseto", element: "Terra", elementLevel: 1, size: "Médio", chapter: "Campos ao Redor de Aurelis", chapterNumber: 1, isBoss: false },
  { id: "filhotinho-selvagem", name: "Filhotinho Selvagem", level: 9, race: "Bruto", element: "Neutro", elementLevel: 1, size: "Pequeno", chapter: "Campos ao Redor de Aurelis", chapterNumber: 1, isBoss: false },
  { id: "aerofel", name: "Aerofel", level: 11, race: "Bruto", element: "Vento", elementLevel: 1, size: "Pequeno", chapter: "Campos ao Redor de Aurelis", chapterNumber: 1, isBoss: false },
  { id: "cavador-sombrio", name: "Cavador-Sombrio", level: 14, race: "Inseto", element: "Sombrio", elementLevel: 1, size: "Pequeno", chapter: "Campos ao Redor de Aurelis", chapterNumber: 1, isBoss: false },
  { id: "sapo-de-poca", name: "Sapo-de-Poça", level: 18, race: "Anfíbio", element: "Água", elementLevel: 1, size: "Médio", chapter: "Campos ao Redor de Aurelis", chapterNumber: 1, isBoss: false },
  { id: "salgueira-ancestral", name: "Salgueira Ancestral", level: 20, race: "Planta", element: "Terra", elementLevel: 2, size: "Grande", chapter: "Campos ao Redor de Aurelis", chapterNumber: 1, isBoss: true, bossRank: "Mini" },

  /* ---- Capítulo 2 — Esgotos de Aurelis (Nv. 15–30) --------------------- */
  { id: "ovo-rastejante", name: "Ovo Rastejante", level: 10, race: "Inseto", element: "Terra", elementLevel: 1, size: "Pequeno", chapter: "Esgotos de Aurelis", chapterNumber: 2, isBoss: false },
  { id: "larva-luminosa", name: "Larva Luminosa", level: 13, race: "Inseto", element: "Neutro", elementLevel: 1, size: "Pequeno", chapter: "Esgotos de Aurelis", chapterNumber: 2, isBoss: false },
  { id: "aracnil", name: "Aracnil", level: 18, race: "Inseto", element: "Terra", elementLevel: 1, size: "Médio", chapter: "Esgotos de Aurelis", chapterNumber: 2, isBoss: false },
  { id: "esporo-flutuante", name: "Esporo Flutuante", level: 20, race: "Planta", element: "Água", elementLevel: 1, size: "Pequeno", chapter: "Esgotos de Aurelis", chapterNumber: 2, isBoss: false },
  { id: "trilobite-cavernoso", name: "Trilobite Cavernoso", level: 23, race: "Anfíbio", element: "Água", elementLevel: 1, size: "Médio", chapter: "Esgotos de Aurelis", chapterNumber: 2, isBoss: false },
  { id: "fungo-rastejante", name: "Fungo Rastejante", level: 26, race: "Planta", element: "Terra", elementLevel: 1, size: "Pequeno", chapter: "Esgotos de Aurelis", chapterNumber: 2, isBoss: false },
  { id: "chifre-sombra", name: "Chifre-Sombra", level: 29, race: "Amorfo", element: "Fantasma", elementLevel: 1, size: "Médio", chapter: "Esgotos de Aurelis", chapterNumber: 2, isBoss: true, bossRank: "Mini" },

  /* ---- Capítulo 3 — Florestas de Sylmere (Nv. 25–45) ------------------- */
  { id: "mandragora-cintilante", name: "Mandrágora Cintilante", level: 25, race: "Planta", element: "Terra", elementLevel: 1, size: "Pequeno", chapter: "Florestas de Sylmere", chapterNumber: 3, isBoss: false },
  { id: "vagalume-feerico", name: "Vagalume Feérico", level: 27, race: "Inseto", element: "Neutro", elementLevel: 1, size: "Pequeno", chapter: "Florestas de Sylmere", chapterNumber: 3, isBoss: false },
  { id: "tocha-ambulante", name: "Tocha Ambulante", level: 30, race: "Amorfo", element: "Fogo", elementLevel: 1, size: "Médio", chapter: "Florestas de Sylmere", chapterNumber: 3, isBoss: false },
  { id: "coruja-arcana", name: "Coruja Arcana", level: 32, race: "Bruto", element: "Vento", elementLevel: 1, size: "Pequeno", chapter: "Florestas de Sylmere", chapterNumber: 3, isBoss: false },
  { id: "sussurro-da-copa", name: "Sussurro da Copa", level: 36, race: "Morto-vivo", element: "Sombrio", elementLevel: 1, size: "Pequeno", chapter: "Florestas de Sylmere", chapterNumber: 3, isBoss: false },
  { id: "espinho-vagante", name: "Espinho Vagante", level: 39, race: "Planta", element: "Terra", elementLevel: 2, size: "Médio", chapter: "Florestas de Sylmere", chapterNumber: 3, isBoss: false },
  { id: "guardiao-de-galhos", name: "Guardião de Galhos", level: 44, race: "Planta", element: "Terra", elementLevel: 2, size: "Grande", chapter: "Florestas de Sylmere", chapterNumber: 3, isBoss: true, bossRank: "Mini" },

  /* ---- Capítulo 4 — Torre Arcana (Nv. 40–60) -------------------------- */
  { id: "pesadelo-menor", name: "Pesadelo Menor", level: 40, race: "Demônio", element: "Sombrio", elementLevel: 1, size: "Pequeno", chapter: "Torre Arcana", chapterNumber: 4, isBoss: false },
  { id: "diabrete-fumegante", name: "Diabrete Fumegante", level: 43, race: "Demônio", element: "Fogo", elementLevel: 1, size: "Pequeno", chapter: "Torre Arcana", chapterNumber: 4, isBoss: false },
  { id: "grimorio-vivo", name: "Grimório Vivo", level: 46, race: "Amorfo", element: "Sombrio", elementLevel: 1, size: "Pequeno", chapter: "Torre Arcana", chapterNumber: 4, isBoss: false },
  { id: "sentinela-de-cristal", name: "Sentinela de Cristal", level: 49, race: "Amorfo", element: "Neutro", elementLevel: 2, size: "Médio", chapter: "Torre Arcana", chapterNumber: 4, isBoss: false },
  { id: "chama-perdida", name: "Chama Perdida", level: 52, race: "Demônio", element: "Fogo", elementLevel: 1, size: "Pequeno", chapter: "Torre Arcana", chapterNumber: 4, isBoss: false },
  { id: "golem-faiscante", name: "Golem Faiscante", level: 55, race: "Amorfo", element: "Terra", elementLevel: 2, size: "Grande", chapter: "Torre Arcana", chapterNumber: 4, isBoss: false },
  { id: "reflexo-sombrio", name: "Reflexo Sombrio", level: 60, race: "Amorfo", element: "Sombrio", elementLevel: 2, size: "Médio", chapter: "Torre Arcana", chapterNumber: 4, isBoss: true, bossRank: "MVP" },

  /* ---- Capítulo 5 — Colinas de Kaeshin (Nv. 50–70) ------------------- */
  { id: "lobo-das-brumas", name: "Lobo das Brumas", level: 50, race: "Bruto", element: "Água", elementLevel: 1, size: "Médio", chapter: "Colinas de Kaeshin", chapterNumber: 5, isBoss: false },
  { id: "urso-espinho", name: "Urso-Espinho", level: 53, race: "Bruto", element: "Terra", elementLevel: 1, size: "Grande", chapter: "Colinas de Kaeshin", chapterNumber: 5, isBoss: false },
  { id: "espirito-da-cachoeira", name: "Espírito da Cachoeira", level: 56, race: "Amorfo", element: "Água", elementLevel: 1, size: "Médio", chapter: "Colinas de Kaeshin", chapterNumber: 5, isBoss: false },
  { id: "pantera-sombria", name: "Pantera Sombria", level: 59, race: "Bruto", element: "Sombrio", elementLevel: 1, size: "Médio", chapter: "Colinas de Kaeshin", chapterNumber: 5, isBoss: false },
  { id: "falcao-de-granito", name: "Falcão de Granito", level: 62, race: "Bruto", element: "Vento", elementLevel: 1, size: "Pequeno", chapter: "Colinas de Kaeshin", chapterNumber: 5, isBoss: false },
  { id: "cervo-ancestral", name: "Cervo Ancestral", level: 68, race: "Bruto", element: "Terra", elementLevel: 2, size: "Grande", chapter: "Colinas de Kaeshin", chapterNumber: 5, isBoss: true, bossRank: "Mini" },

  /* ---- Capítulo 6 — Caverna de Kaeshin (Nv. 60–80) ------------------ */
  { id: "ossada-errante", name: "Ossada Errante", level: 60, race: "Morto-vivo", element: "Sombrio", elementLevel: 1, size: "Médio", chapter: "Caverna de Kaeshin", chapterNumber: 6, isBoss: false },
  { id: "guerreiro-caido", name: "Guerreiro Caído", level: 64, race: "Morto-vivo", element: "Sombrio", elementLevel: 1, size: "Médio", chapter: "Caverna de Kaeshin", chapterNumber: 6, isBoss: false },
  { id: "corvo-necrofago", name: "Corvo Necrófago", level: 67, race: "Morto-vivo", element: "Vento", elementLevel: 1, size: "Pequeno", chapter: "Caverna de Kaeshin", chapterNumber: 6, isBoss: false },
  { id: "alma-presa", name: "Alma Presa", level: 70, race: "Amorfo", element: "Fantasma", elementLevel: 1, size: "Pequeno", chapter: "Caverna de Kaeshin", chapterNumber: 6, isBoss: false },
  { id: "carrasco-enferrujado", name: "Carrasco Enferrujado", level: 74, race: "Morto-vivo", element: "Sombrio", elementLevel: 2, size: "Grande", chapter: "Caverna de Kaeshin", chapterNumber: 6, isBoss: false },
  { id: "general-esquecido", name: "General Esquecido", level: 80, race: "Morto-vivo", element: "Sombrio", elementLevel: 2, size: "Grande", chapter: "Caverna de Kaeshin", chapterNumber: 6, isBoss: true, bossRank: "MVP" },

  /* ---- Capítulo 7 — Dunas de Zahkar (Nv. 70–90) ------------------- */
  { id: "aranha-do-sol", name: "Aranha-do-Sol", level: 70, race: "Inseto", element: "Fogo", elementLevel: 1, size: "Pequeno", chapter: "Dunas de Zahkar", chapterNumber: 7, isBoss: false },
  { id: "escaravelho-blindado", name: "Escaravelho Blindado", level: 73, race: "Inseto", element: "Terra", elementLevel: 1, size: "Pequeno", chapter: "Dunas de Zahkar", chapterNumber: 7, isBoss: false },
  { id: "camelo-selvagem", name: "Camelo Selvagem", level: 76, race: "Bruto", element: "Terra", elementLevel: 1, size: "Grande", chapter: "Dunas de Zahkar", chapterNumber: 7, isBoss: false },
  { id: "vibora-das-areias", name: "Víbora das Areias", level: 79, race: "Bruto", element: "Terra", elementLevel: 1, size: "Pequeno", chapter: "Dunas de Zahkar", chapterNumber: 7, isBoss: false },
  { id: "djinn-menor", name: "Djinn Menor", level: 83, race: "Demônio", element: "Fogo", elementLevel: 1, size: "Médio", chapter: "Dunas de Zahkar", chapterNumber: 7, isBoss: false },
  { id: "colosso-de-areia", name: "Colosso de Areia", level: 89, race: "Amorfo", element: "Terra", elementLevel: 2, size: "Grande", chapter: "Dunas de Zahkar", chapterNumber: 7, isBoss: true, bossRank: "Mini" },

  /* ---- Capítulo 8 — Pirâmide Esquecida (Nv. 85–110) ------------- */
  { id: "mumia-selada", name: "Múmia Selada", level: 85, race: "Morto-vivo", element: "Terra", elementLevel: 1, size: "Médio", chapter: "Pirâmide Esquecida", chapterNumber: 8, isBoss: false },
  { id: "escaravelho-dourado", name: "Escaravelho Dourado", level: 88, race: "Inseto", element: "Terra", elementLevel: 1, size: "Pequeno", chapter: "Pirâmide Esquecida", chapterNumber: 8, isBoss: false },
  { id: "guardiao-de-sarcofago", name: "Guardião de Sarcófago", level: 92, race: "Morto-vivo", element: "Sombrio", elementLevel: 1, size: "Grande", chapter: "Pirâmide Esquecida", chapterNumber: 8, isBoss: false },
  { id: "sacerdote-amaldicoado", name: "Sacerdote Amaldiçoado", level: 96, race: "Morto-vivo", element: "Sombrio", elementLevel: 2, size: "Médio", chapter: "Pirâmide Esquecida", chapterNumber: 8, isBoss: false },
  { id: "espectro-dourado", name: "Espectro Dourado", level: 101, race: "Amorfo", element: "Fantasma", elementLevel: 2, size: "Médio", chapter: "Pirâmide Esquecida", chapterNumber: 8, isBoss: false },
  { id: "rei-do-areal-eterno", name: "Rei do Areal Eterno", level: 110, race: "Morto-vivo", element: "Sombrio", elementLevel: 2, size: "Grande", chapter: "Pirâmide Esquecida", chapterNumber: 8, isBoss: true, bossRank: "MVP" },

  /* ---- Capítulo 9 — Costa de Ventomar (Nv. 100–130) ------------ */
  { id: "sereia-das-mares", name: "Sereia das Marés", level: 100, race: "Peixe", element: "Água", elementLevel: 1, size: "Médio", chapter: "Costa de Ventomar", chapterNumber: 9, isBoss: false },
  { id: "caranguejo-titanico", name: "Caranguejo Titânico", level: 104, race: "Bruto", element: "Água", elementLevel: 1, size: "Grande", chapter: "Costa de Ventomar", chapterNumber: 9, isBoss: false },
  { id: "agua-viva-luminosa", name: "Água-viva Luminosa", level: 108, race: "Amorfo", element: "Água", elementLevel: 1, size: "Pequeno", chapter: "Costa de Ventomar", chapterNumber: 9, isBoss: false },
  { id: "pirata-afogado", name: "Pirata Afogado", level: 112, race: "Morto-vivo", element: "Água", elementLevel: 1, size: "Médio", chapter: "Costa de Ventomar", chapterNumber: 9, isBoss: false },
  { id: "serpente-marinha-jovem", name: "Serpente Marinha Jovem", level: 118, race: "Dragão", element: "Água", elementLevel: 2, size: "Grande", chapter: "Costa de Ventomar", chapterNumber: 9, isBoss: false },
  { id: "kraken-jovem", name: "Kraken Jovem", level: 128, race: "Peixe", element: "Água", elementLevel: 2, size: "Grande", chapter: "Costa de Ventomar", chapterNumber: 9, isBoss: true, bossRank: "Mini" },

  /* ---- Capítulo 10 — Navio Naufragado (Nv. 120+) -------------- */
  { id: "fantasma-do-conves", name: "Fantasma do Convés", level: 120, race: "Morto-vivo", element: "Fantasma", elementLevel: 1, size: "Médio", chapter: "Navio Naufragado", chapterNumber: 10, isBoss: false },
  { id: "marujo-amaldicoado", name: "Marujo Amaldiçoado", level: 124, race: "Morto-vivo", element: "Água", elementLevel: 1, size: "Médio", chapter: "Navio Naufragado", chapterNumber: 10, isBoss: false },
  { id: "sino-assombrado", name: "Sino Assombrado", level: 128, race: "Amorfo", element: "Fantasma", elementLevel: 2, size: "Médio", chapter: "Navio Naufragado", chapterNumber: 10, isBoss: false },
  { id: "capitao-sem-nome", name: "Capitão Sem-Nome", level: 133, race: "Morto-vivo", element: "Água", elementLevel: 2, size: "Grande", chapter: "Navio Naufragado", chapterNumber: 10, isBoss: false },
  { id: "capitao-amaldicoado", name: "Capitão Amaldiçoado", level: 140, race: "Morto-vivo", element: "Água", elementLevel: 2, size: "Grande", chapter: "Navio Naufragado", chapterNumber: 10, isBoss: true, bossRank: "MVP" },
  { id: "serpente-das-profundezas", name: "Serpente das Profundezas", level: 150, race: "Dragão", element: "Água", elementLevel: 3, size: "Grande", chapter: "Navio Naufragado", chapterNumber: 10, isBoss: true, bossRank: "MVP", isFinalBoss: true },
] as const satisfies readonly Monster[];

/** União de todos os `id`s de monstro — garante integridade referencial. */
export type MonsterId = (typeof MONSTERS)[number]["id"];

/** Todos os chefes (Mini + MVP). */
export const BOSSES: readonly Monster[] = MONSTERS.filter((m) => m.isBoss);

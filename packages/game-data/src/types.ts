/**
 * Tipos centrais dos dados do jogo.
 *
 * Fonte da verdade: `docs/GDD.md` (v0.2). Todos os nomes em português seguem
 * exatamente as tabelas do GDD. Estes tipos descrevem apenas a *forma* dos
 * dados — nenhuma lógica de combate ou de UI vive aqui.
 */

/* -------------------------------------------------------------------------- */
/*  Atributos (GDD seção 3)                                                    */
/* -------------------------------------------------------------------------- */

/** Os 6 atributos clássicos do personagem. */
export type Attribute = "FOR" | "AGI" | "VIT" | "INT" | "DES" | "SOR";

/* -------------------------------------------------------------------------- */
/*  Bestiário (GDD seção 5)                                                    */
/* -------------------------------------------------------------------------- */

/** Raça do monstro (coluna "Raça" das tabelas do bestiário). */
export type MonsterRace =
  | "Planta"
  | "Bruto"
  | "Inseto"
  | "Anfíbio"
  | "Amorfo"
  | "Morto-vivo"
  | "Demônio"
  | "Peixe"
  | "Dragão";

/** Elemento base do monstro, sem o nível elemental. */
export type MonsterElement =
  | "Neutro"
  | "Água"
  | "Terra"
  | "Vento"
  | "Fogo"
  | "Sombrio"
  | "Fantasma";

/** Nível do elemento (o "1", "2" ou "3" que acompanha o elemento no GDD). */
export type ElementLevel = 1 | 2 | 3;

/** Tamanho do monstro (coluna "Tamanho"). */
export type MonsterSize = "Pequeno" | "Médio" | "Grande";

/**
 * Classificação de chefe. Monstros comuns não têm `bossRank`.
 * - `Mini`  — mini-chefe de capítulo (marcado como "(Mini)" no GDD).
 * - `MVP`   — chefe maior / MVP (marcado como "(MVP)" no GDD).
 */
export type BossRank = "Mini" | "MVP";

export interface Monster {
  /** Identificador estável em kebab-case (usado para referências cruzadas). */
  id: string;
  /** Nome de exibição, exatamente como no GDD (sem o sufixo "(Mini)"/"(MVP)"). */
  name: string;
  /** Nível do monstro. */
  level: number;
  race: MonsterRace;
  /** Elemento base. Ver também `elementLevel`. */
  element: MonsterElement;
  /** Nível elemental que acompanha o elemento (ex.: "Água 2" -> 2). */
  elementLevel: ElementLevel;
  size: MonsterSize;
  /** Nome do capítulo/região a que o monstro pertence (GDD seção 2/5). */
  chapter: string;
  /** Número do capítulo (1–10), para ordenação/curva de dificuldade. */
  chapterNumber: number;
  /** `true` para qualquer monstro marcado como "(Mini)" ou "(MVP)" no GDD. */
  isBoss: boolean;
  /** Presente somente quando `isBoss` é `true`. */
  bossRank?: BossRank;
  /** `true` apenas para o "MVP Final" do capítulo 10. */
  isFinalBoss?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Árvore de Classes (GDD seção 4)                                            */
/* -------------------------------------------------------------------------- */

/** As 6 linhas de classe base. */
export type ClassLine =
  | "Guerreiro"
  | "Arcanista"
  | "Caçador"
  | "Infiltrador"
  | "Mercador"
  | "Acólito";

/** Tier do job: 1 (base) -> 2 -> 3 ("Transcendido") -> 4 ("Avançado"). */
export type JobTier = 1 | 2 | 3 | 4;

/**
 * Caminho de evolução dentro de uma linha. Cada linha tem exatamente dois
 * caminhos (`"A"` e `"B"`). O job base (tier 1) é compartilhado e tem `path: null`.
 */
export type JobPath = "A" | "B";

/** Habilidade de assinatura de um job (coluna "Habilidades" do GDD). */
export interface SignatureSkill {
  name: string;
  description: string;
}

export interface JobClass {
  /** Identificador estável em kebab-case (derivado do nome). */
  id: string;
  /** Nome de exibição, exatamente como no GDD. */
  name: string;
  /** Linha de classe a que o job pertence. */
  line: ClassLine;
  tier: JobTier;
  /** Caminho de evolução; `null` somente para o job base (tier 1). */
  path: JobPath | null;
  /** `id` do job imediatamente anterior; `null` somente para o job base. */
  previousJobId: string | null;
  /** Atributos foco (coluna "Atributos Foco"). Vazio para o job base. */
  attributeFocus: Attribute[];
  /** Estilo de jogo / diferencial (coluna "Estilo de Jogo / Diferencial"). */
  playstyle: string;
  /** Habilidades de assinatura. Vazio para o job base. */
  signatureSkills: SignatureSkill[];
}

/* -------------------------------------------------------------------------- */
/*  Selos de Batalha (GDD seção 6)                                             */
/* -------------------------------------------------------------------------- */

/** As 7 categorias de equipamento que aceitam Selos (GDD 6.1–6.7). */
export type EquipmentSlot =
  | "Arma"
  | "Armadura"
  | "Escudo"
  | "Capa"
  | "Sapato"
  | "Acessório"
  | "Elmo";

/** Raridade do Selo (cresce com a faixa de nível do monstro de origem). */
export type SealRarity =
  | "Comum"
  | "Incomum"
  | "Raro"
  | "Épico"
  | "Lendário";

export interface BattleSeal {
  /** Identificador estável em kebab-case. */
  id: string;
  /** Nome de exibição, exatamente como no GDD (ex.: "Selo do Coelhal"). */
  name: string;
  /**
   * `id` do monstro de origem em `bestiary.ts`. O tipo `MonsterId` (ver
   * `bestiary.ts`) garante em tempo de compilação que a referência existe.
   */
  sourceMonsterId: string;
  equipmentSlot: EquipmentSlot;
  rarity: SealRarity;
  /**
   * Faixa de nível do monstro de origem, como texto (ex.: "Nv 1–20",
   * "Nv 120+"), exatamente como aparece entre parênteses no GDD.
   */
  sourceLevelRange: string;
  /** Efeito principal (coluna "Efeito Principal"). */
  mainEffect: string;
  /** Bônus de coleção / "Compêndio" (coluna "Bônus de Compêndio"). */
  collectionBonus: string;
}

/* -------------------------------------------------------------------------- */
/*  Companheiros (GDD seção 7)                                                 */
/* -------------------------------------------------------------------------- */

/** Tier de raridade do Companheiro. */
export type CompanionTier = "S" | "A" | "B" | "C";

export interface Companion {
  /** Identificador estável em kebab-case. */
  id: string;
  /** Nome de exibição, exatamente como no GDD. */
  name: string;
  tier: CompanionTier;
  /** Papel de combate fixo (coluna "Papel"). */
  role: string;
  /** Descrição (coluna "Descrição"). */
  description: string;
  /** Nome alternativo, quando o GDD lista dois nomes para o mesmo companheiro. */
  aka?: string;
}

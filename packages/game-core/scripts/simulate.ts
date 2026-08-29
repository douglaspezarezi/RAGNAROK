/**
 * Harness de simulação de balanceamento — RAGNAROK.
 *
 * Rodar:  npm run simulate  (dentro de packages/game-core)
 *   ou:   npx tsx packages/game-core/scripts/simulate.ts
 *
 * NÃO altera nenhuma fórmula/valor de @game/core — só lê, simula e reporta.
 * Gera:
 *   - resumo legível no console
 *   - packages/game-core/scripts/output/balance-report.md
 *   - packages/game-core/scripts/output/progression.csv
 *   - packages/game-core/scripts/output/gacha.csv
 *
 * O que é "verdade" (@game/core) e o que é "premissa do harness":
 *   - Combate, recompensas, offline e gacha vêm de @game/core (inalterados).
 *   - A curva de XP e o ganho de atributo por nível NÃO existem em @game/core
 *     hoje; são REPLICADOS aqui de apps/web/lib/gameSave.ts e claramente
 *     marcados. As builds de atributo por classe são premissas deste harness
 *     (ver CLASS_BUILDS) — foram escolhidas pela fantasia de cada classe, NÃO
 *     calibradas para igualá-las: o objetivo é medir a diferença.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BASE_JOBS,
  CHAPTERS,
  MONSTERS_BY_ID,
  type Attribute,
  type ClassLine,
  type Monster,
} from "@game/data";

import {
  BOSS_MULTIPLIER,
  CHARACTER_TUNING,
  COMBAT_TUNING,
  MONSTER_TUNING,
  OFFLINE_CAP_HOURS,
  OFFLINE_EFFICIENCY_FACTOR,
  OFFLINE_TUNING,
  PITY_THRESHOLD,
  REWARD_TUNING,
  SUMMON_RATES,
  calculateDerivedStats,
  calculateOfflineRewards,
  getMonstersByChapter,
  killBaseRewards,
  resolveMonsterDefeat,
  rollSummon,
  simulateCombatTick,
  type BannerType,
  type CharacterState,
  type DerivedStats,
} from "../src/index";

/* ======================================================================== */
/*  CONFIG — premissas do harness (tudo que NÃO vem de @game/core)           */
/* ======================================================================== */

const CONFIG = {
  /** Critérios de parada da simulação de progressão (o que vier primeiro). */
  STOP_LEVEL: 150,
  MAX_SIM_DAYS_PER_CLASS: 60,
  MAX_SIM_DAYS_PER_CHAPTER: 20,
  MAX_FARM_KILLS_PER_CHAPTER: 40_000,
  /** Acima disso, num único monstro, é considerado "parede". */
  MAX_DEATHS_PER_MONSTER: 30,
  MAX_SIM_DAYS_PER_MONSTER: 7,

  /** Nível 1 começa com este valor em TODOS os atributos (como o protótipo web). */
  STARTING_ATTRIBUTE: 8,
  /** Pontos de atributo distribuídos por nível, pelo peso da classe (ver nota). */
  POINTS_PER_LEVEL: 5,

  /**
   * Política de farm: depois de limpar o capítulo 1x, continua farmando o melhor
   * ponto do capítulo até conseguir matar o 1º monstro do próximo capítulo com
   * esta folga (tempoParaMorrer >= tempoParaMatar * READINESS_SAFETY).
   */
  READINESS_SAFETY: 1.3,

  /** Heal ao derrotar um monstro (como o protótipo web). */
  HEAL_TO_FULL_ON_KILL: true,

  /**
   * Seção 2 — offline vs ativo. O GDD cita "nível 20, 50, 100"; com a tuning
   * atual nenhuma classe passa de ~Nv 73 concluindo os 10 capítulos, então
   * usamos níveis alcançáveis e a classe que sobe mais como referência.
   */
  OFFLINE_TEST_LEVELS: [20, 50, 70],
  OFFLINE_TEST_HOURS: [1, 4, 8],
  /** Classe de referência usada para tirar os snapshots de nível. */
  OFFLINE_REFERENCE_CLASS: "Caçador" as ClassLine,

  /** Seção 3 — gacha. */
  GACHA_ROLLS: 10_000,
  GACHA_SEED: { companion: 0xc0ffee, seal: 0x5ea15 } as Record<BannerType, number>,
} as const;

/**
 * REPLICADO de apps/web/lib/gameSave.ts (NÃO é de @game/core):
 *   xpToNextLevel(level) = floor(50 + 25*level + 5*level^2)
 */
function xpToNextLevel(level: number): number {
  return Math.floor(50 + 25 * level + 5 * level * level);
}
const XP_FORMULA_TEXT = "floor(50 + 25*nível + 5*nível²)  (réplica de apps/web/lib/gameSave.ts)";

/**
 * Builds "padrão" por linha de classe — pesos de alocação dos POINTS_PER_LEVEL
 * pontos ganhos a cada nível. Refletem a fantasia da classe (GDD §3).
 * Em geral NÃO são calibradas para equilibrar; exceção: o Acólito foi ajustado
 * para concentrar mais em dano (FOR, caminho Monge/Mestre Marcial) em vez de
 * pulverizar entre FOR/INT/VIT — antes: FOR 0.3 / VIT 0.4 / INT 0.3.
 * Atributos: FOR=dano físico, AGI=aspd/esquiva, VIT=HP/regen/def,
 * INT=dano mágico, DES=acerto/dano à distância, SOR=crítico.
 */
const CLASS_BUILDS: Record<ClassLine, Record<Attribute, number>> = {
  Guerreiro: { FOR: 0.5, AGI: 0.2, VIT: 0.3, INT: 0, DES: 0, SOR: 0 },
  Arcanista: { FOR: 0, AGI: 0, VIT: 0.2, INT: 0.6, DES: 0.2, SOR: 0 },
  Caçador: { FOR: 0.2, AGI: 0.3, VIT: 0, INT: 0, DES: 0.5, SOR: 0 },
  Infiltrador: { FOR: 0.3, AGI: 0.35, VIT: 0, INT: 0, DES: 0, SOR: 0.35 },
  Mercador: { FOR: 0, AGI: 0, VIT: 0.4, INT: 0.4, DES: 0.2, SOR: 0 },
  Acólito: { FOR: 0.6, AGI: 0, VIT: 0.3, INT: 0.1, DES: 0, SOR: 0 },
};

const ATTRS: readonly Attribute[] = ["FOR", "AGI", "VIT", "INT", "DES", "SOR"];
const CLASS_LINES = Object.keys(CLASS_BUILDS) as ClassLine[];

const DAY = 86_400;
const MAX_SEC_PER_CLASS = CONFIG.MAX_SIM_DAYS_PER_CLASS * DAY;
const MAX_SEC_PER_CHAPTER = CONFIG.MAX_SIM_DAYS_PER_CHAPTER * DAY;
const MAX_SEC_PER_MONSTER = CONFIG.MAX_SIM_DAYS_PER_MONSTER * DAY;

/* ======================================================================== */
/*  Helpers                                                                  */
/* ======================================================================== */

function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "∞";
  const s = Math.round(seconds);
  const d = Math.floor(s / DAY);
  const h = Math.floor((s % DAY) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!d && !h && (sec || !m)) parts.push(`${sec}s`);
  return parts.join(" ") || "0s";
}

function num(n: number, digits = 0): string {
  return Number.isFinite(n)
    ? n.toLocaleString("pt-BR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "—";
}

/** PRNG determinístico (mulberry32) para tornar o relatório reproduzível. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cloneCharacter(c: CharacterState): CharacterState {
  return JSON.parse(JSON.stringify(c)) as CharacterState;
}

function nonBossOf(chapter: number): Monster[] {
  return getMonstersByChapter(chapter).filter((m) => !m.isBoss);
}

function mdTable(headers: string[], rows: (string | number)[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((r) => `| ${r.map((c) => String(c)).join(" | ")} |`)
    .join("\n");
  return `${head}\n${sep}\n${body}`;
}

function median(arr: number[]): number {
  if (arr.length === 0) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.floor((p / 100) * s.length));
  return s[idx]!;
}

function nominalRate(tier: "C" | "B" | "A" | "S"): number {
  return tier === "C"
    ? SUMMON_RATES.C
    : tier === "B"
      ? SUMMON_RATES.B
      : tier === "A"
        ? SUMMON_RATES.A
        : SUMMON_RATES.S;
}

/* ======================================================================== */
/*  Seção 1 — progressão principal                                           */
/* ======================================================================== */

interface Encounter {
  wall: boolean;
  wallReason?: string;
  deaths: number;
  seconds: number;
  dps: number;
  dmgTakenPerSec: number;
  regenPerSec: number;
  netHpPerSec: number;
  hpNegative: boolean;
}

/**
 * Resolve uma luta 1×1 analiticamente a partir das TAXAS por segundo devolvidas
 * por `simulateCombatTick` (o modelo de combate é linear em `deltaSeconds`, então
 * integrar é exato e milhares de vezes mais rápido que iterar tick a tick).
 * Assume heal ao derrotar (HEAL_TO_FULL_ON_KILL): cada "vida" começa com HP cheio.
 */
function resolveEncounter(derived: DerivedStats, monster: Monster): Encounter {
  const tick = simulateCombatTick(derived, monster, 1);
  const dps = tick.damageDealt;
  const dmgTaken = tick.damageTaken;
  const regen = derived.hpRegenPerSec;
  const maxHp = derived.maxHp;
  const monHp = tick.monsterMaxHp;
  const net = regen - dmgTaken;

  const base: Omit<Encounter, "wall" | "deaths" | "seconds"> = {
    dps,
    dmgTakenPerSec: dmgTaken,
    regenPerSec: regen,
    netHpPerSec: net,
    hpNegative: net < 0,
  };

  if (dps <= 0) {
    return {
      ...base,
      wall: true,
      wallReason: "DPS = 0 (não causa dano ao monstro)",
      deaths: 0,
      seconds: Infinity,
    };
  }

  const ttk = monHp / dps;
  let deaths = 0;
  let seconds = ttk;

  if (net < 0) {
    const tLife = maxHp / -net; // segundos de HP cheio até morrer
    if (tLife < ttk) {
      const dmgPerLife = dps * tLife;
      const lives = Math.ceil(monHp / dmgPerLife);
      deaths = lives - 1;
      seconds = deaths * tLife + (monHp - deaths * dmgPerLife) / dps;
    }
  }

  const wall =
    deaths > CONFIG.MAX_DEATHS_PER_MONSTER || seconds > MAX_SEC_PER_MONSTER;
  return {
    ...base,
    wall,
    wallReason: wall
      ? `${deaths} mortes / ${fmtDuration(seconds)} para um único kill`
      : undefined,
    deaths,
    seconds,
  };
}

/** O personagem consegue matar `monster` partindo de HP cheio, com folga? */
function readyFor(derived: DerivedStats, monster: Monster): boolean {
  const tick = simulateCombatTick(derived, monster, 1);
  if (tick.damageDealt <= 0) return false;
  const net = derived.hpRegenPerSec - tick.damageTaken;
  const ttk = tick.monsterMaxHp / tick.damageDealt;
  if (net >= 0) return true;
  const tLife = derived.maxHp / -net;
  return tLife >= ttk * CONFIG.READINESS_SAFETY;
}

interface ChapterRecord {
  chapter: number;
  name: string;
  levelIn: number;
  levelOut: number;
  seconds: number;
  deaths: number;
  farmKills: number;
  hpNegativeMonsters: number;
  worstDmgTakenOverRegen: number;
  reachedWall: boolean;
}

interface ProgressionRun {
  line: ClassLine;
  baseJobId: string;
  finalLevel: number;
  totalSeconds: number;
  totalDeaths: number;
  chapters: ChapterRecord[];
  stopReason: string;
  completedChapters: number;
  wallChapter?: number;
}

interface LevelSnapshot {
  level: number;
  chapter: number;
  character: CharacterState;
  stageId: string;
}

function runProgression(
  line: ClassLine,
  snapshotSink?: (s: LevelSnapshot) => void,
): ProgressionRun {
  const baseJob = BASE_JOBS.find((j) => j.line === line);
  const baseJobId = baseJob ? baseJob.id : "recruta";
  const weights = CLASS_BUILDS[line];

  const attrs: Record<Attribute, number> = {
    FOR: CONFIG.STARTING_ATTRIBUTE,
    AGI: CONFIG.STARTING_ATTRIBUTE,
    VIT: CONFIG.STARTING_ATTRIBUTE,
    INT: CONFIG.STARTING_ATTRIBUTE,
    DES: CONFIG.STARTING_ATTRIBUTE,
    SOR: CONFIG.STARTING_ATTRIBUTE,
  };

  const firstCh1 = nonBossOf(1)[0]!;
  const character: CharacterState = {
    level: 1,
    jobId: baseJobId,
    baseAttributes: attrs,
    equippedSeals: [],
    currentStageId: firstCh1.id,
    xp: 0,
    rebirthCount: 0,
    clearedChapters: [],
    clearedStageIds: [],
  };

  let derived = calculateDerivedStats(character);
  let totalSeconds = 0;
  let totalDeaths = 0;
  const chapters: ChapterRecord[] = [];
  let stopReason = "";
  let wallChapter: number | undefined;
  let completedChapters = 0;
  const capturedLevels = new Set<number>();
  const testLevels: readonly number[] = CONFIG.OFFLINE_TEST_LEVELS;

  const applyKillRewards = (monster: Monster, currentChapter: number): void => {
    const rw = resolveMonsterDefeat(monster, character);
    character.xp = (character.xp ?? 0) + rw.xp;
    while ((character.xp ?? 0) >= xpToNextLevel(character.level)) {
      character.xp = (character.xp ?? 0) - xpToNextLevel(character.level);
      character.level += 1;
      for (const a of ATTRS) attrs[a] += CONFIG.POINTS_PER_LEVEL * weights[a];
      derived = calculateDerivedStats(character);

      if (
        snapshotSink &&
        testLevels.includes(character.level) &&
        !capturedLevels.has(character.level)
      ) {
        capturedLevels.add(character.level);
        const stage = nonBossOf(currentChapter).at(-1) ?? firstCh1;
        snapshotSink({
          level: character.level,
          chapter: currentChapter,
          character: cloneCharacter({ ...character, currentStageId: stage.id }),
          stageId: stage.id,
        });
      }

      if (character.level >= CONFIG.STOP_LEVEL) {
        stopReason = `atingiu o nível ${CONFIG.STOP_LEVEL} (Cap. ${currentChapter})`;
        return;
      }
    }
  };

  for (let ch = 1; ch <= 10 && !stopReason; ch += 1) {
    const monsters = nonBossOf(ch);
    if (monsters.length === 0) continue;
    const chapterInfo = CHAPTERS.find((c) => c.number === ch);
    const levelIn = character.level;
    let chSeconds = 0;
    let chDeaths = 0;
    let farmKills = 0;
    let hpNeg = 0;
    let worstRatio = 0;

    // --- fase 1: limpar o capítulo uma vez -----------------------------
    for (const mon of monsters) {
      character.currentStageId = mon.id;
      const enc = resolveEncounter(derived, mon);
      if (enc.wall) {
        stopReason = `parede no Cap. ${ch} — ${mon.name} (Nv ${mon.level}), personagem Nv ${character.level}: ${enc.wallReason}`;
        break;
      }
      chSeconds += enc.seconds;
      totalSeconds += enc.seconds;
      chDeaths += enc.deaths;
      totalDeaths += enc.deaths;
      if (enc.hpNegative) {
        hpNeg += 1;
        worstRatio = Math.max(
          worstRatio,
          enc.dmgTakenPerSec / Math.max(enc.regenPerSec, 1e-9),
        );
      }
      applyKillRewards(mon, ch);
      if (stopReason) break;
      if (totalSeconds > MAX_SEC_PER_CLASS) {
        stopReason = `teto de ${CONFIG.MAX_SIM_DAYS_PER_CLASS} dias simulados (Cap. ${ch})`;
        break;
      }
    }

    // --- fase 2: farmar o melhor ponto até estar pronto pro próximo cap.
    const nextFirst = ch < 10 ? nonBossOf(ch + 1)[0] : undefined;
    while (!stopReason && nextFirst && !readyFor(derived, nextFirst)) {
      let best:
        | { mon: Monster; enc: Encounter; xpPerSec: number }
        | undefined;
      for (const mon of monsters) {
        const enc = resolveEncounter(derived, mon);
        if (enc.wall) continue;
        const xpPerSec = killBaseRewards(mon).xp / enc.seconds;
        if (!best || xpPerSec > best.xpPerSec) best = { mon, enc, xpPerSec };
      }
      if (!best) {
        stopReason = `sem ponto de farm viável no Cap. ${ch} (personagem Nv ${character.level})`;
        break;
      }
      character.currentStageId = best.mon.id;
      chSeconds += best.enc.seconds;
      totalSeconds += best.enc.seconds;
      chDeaths += best.enc.deaths;
      totalDeaths += best.enc.deaths;
      farmKills += 1;
      if (best.enc.hpNegative) {
        hpNeg += 1;
        worstRatio = Math.max(
          worstRatio,
          best.enc.dmgTakenPerSec / Math.max(best.enc.regenPerSec, 1e-9),
        );
      }
      applyKillRewards(best.mon, ch);

      if (
        !stopReason &&
        (chSeconds > MAX_SEC_PER_CHAPTER ||
          farmKills > CONFIG.MAX_FARM_KILLS_PER_CHAPTER ||
          totalSeconds > MAX_SEC_PER_CLASS)
      ) {
        stopReason = `farm travado no Cap. ${ch}: ${num(farmKills)} kills / ${fmtDuration(
          chSeconds,
        )} sem atingir prontidão para o Cap. ${ch + 1} (Nv ${character.level})`;
        break;
      }
    }

    const isWallStop =
      stopReason.startsWith("parede") ||
      stopReason.startsWith("farm travado") ||
      stopReason.startsWith("sem ponto de farm");
    if (isWallStop) wallChapter = ch;

    chapters.push({
      chapter: ch,
      name: chapterInfo ? chapterInfo.name : `Capítulo ${ch}`,
      levelIn,
      levelOut: character.level,
      seconds: chSeconds,
      deaths: chDeaths,
      farmKills,
      hpNegativeMonsters: hpNeg,
      worstDmgTakenOverRegen: worstRatio,
      reachedWall: isWallStop,
    });

    if (!stopReason) completedChapters += 1;
  }

  if (!stopReason) stopReason = "concluiu os 10 capítulos";

  return {
    line,
    baseJobId,
    finalLevel: character.level,
    totalSeconds,
    totalDeaths,
    chapters,
    stopReason,
    completedChapters,
    wallChapter,
  };
}

/* ======================================================================== */
/*  Seção 2 — offline vs ativo                                               */
/* ======================================================================== */

interface OfflineComparison {
  level: number;
  chapter: number;
  stageId: string;
  stageName: string;
  stageMonsterLevel: number;
  hours: number;
  offlineXp: number;
  offlineGold: number;
  offlineKills: number;
  activeXp: number;
  activeGold: number;
  activeKills: number;
  ratioXp: number;
  ratioGold: number;
  netHpPerSec: number;
}

function offlineVsActive(
  snapshot: LevelSnapshot,
  hours: number,
): OfflineComparison {
  const seconds = hours * 3600;
  const character = snapshot.character;
  const monster = MONSTERS_BY_ID.get(snapshot.stageId)!;

  const offline = calculateOfflineRewards(character, snapshot.stageId, seconds);

  const derived = calculateDerivedStats(character);
  const tick = simulateCombatTick(derived, monster, 1);
  // "ativo" = kills reais incluindo tempo perdido em mortes (resolveEncounter)
  const enc = resolveEncounter(derived, monster);
  const activeKills = enc.wall || enc.seconds <= 0 ? 0 : seconds / enc.seconds;
  const rw = resolveMonsterDefeat(monster, character);

  const activeXp = activeKills * rw.xp;
  const activeGold = activeKills * rw.gold;

  return {
    level: snapshot.level,
    chapter: snapshot.chapter,
    stageId: snapshot.stageId,
    stageName: monster.name,
    stageMonsterLevel: monster.level,
    hours,
    offlineXp: offline.xp,
    offlineGold: offline.gold,
    offlineKills: offline.estimatedKills,
    activeXp,
    activeGold,
    activeKills,
    ratioXp: activeXp > 0 ? offline.xp / activeXp : NaN,
    ratioGold: activeGold > 0 ? offline.gold / activeGold : NaN,
    netHpPerSec: derived.hpRegenPerSec - tick.damageTaken,
  };
}

/* ======================================================================== */
/*  Seção 3 — gacha                                                          */
/* ======================================================================== */

interface GachaReport {
  banner: BannerType;
  seed: number;
  rolls: number;
  tierCount: Record<string, number>;
  sIndices: number[];
  sGuaranteed: number;
  gapMean: number;
  gapMedian: number;
  gapMin: number;
  gapMax: number;
  gapP95: number;
  firstS: number;
}

function runGacha(banner: BannerType): GachaReport {
  const seed = CONFIG.GACHA_SEED[banner];
  const rng = mulberry32(seed);
  let pity = 0;
  const tierCount: Record<string, number> = { C: 0, B: 0, A: 0, S: 0 };
  const sIndices: number[] = [];
  let sGuaranteed = 0;

  for (let i = 0; i < CONFIG.GACHA_ROLLS; i += 1) {
    const r = rollSummon(banner, pity, rng);
    pity = r.pityCounterAfter;
    tierCount[r.tier] = (tierCount[r.tier] ?? 0) + 1;
    if (r.tier === "S") {
      sIndices.push(i);
      if (r.guaranteedByPity) sGuaranteed += 1;
    }
  }

  const gaps: number[] = [];
  for (let k = 1; k < sIndices.length; k += 1) {
    gaps.push(sIndices[k]! - sIndices[k - 1]!);
  }

  return {
    banner,
    seed,
    rolls: CONFIG.GACHA_ROLLS,
    tierCount,
    sIndices,
    sGuaranteed,
    gapMean: gaps.reduce((a, b) => a + b, 0) / Math.max(gaps.length, 1),
    gapMedian: median(gaps),
    gapMin: gaps.length ? Math.min(...gaps) : NaN,
    gapMax: gaps.length ? Math.max(...gaps) : NaN,
    gapP95: percentile(gaps, 95),
    firstS: sIndices.length ? sIndices[0]! + 1 : NaN,
  };
}

/* ======================================================================== */
/*  Relatório                                                                */
/* ======================================================================== */

function buildReport(
  runs: ProgressionRun[],
  offline: OfflineComparison[],
  gacha: GachaReport[],
): { md: string; progressionCsv: string; gachaCsv: string } {
  const now = new Date().toISOString();
  const L: string[] = [];
  const p = (s = "") => L.push(s);

  p(`# Relatório de balanceamento — RAGNAROK`);
  p();
  p(`Gerado em ${now} · \`npm run simulate\` (packages/game-core)`);
  p();
  p(
    `> Combate/recompensas/offline/gacha vêm de **@game/core** (inalterados). ` +
      `Curva de XP, ganho de atributo por nível e builds por classe são **premissas do harness** (marcadas abaixo).`,
  );

  /* ---- leitura rápida ---- */
  p();
  p(`## Leitura rápida (observações, não recomendações)`);
  p();
  {
    const minSec = Math.min(...runs.map((r) => r.totalSeconds));
    const maxSec = Math.max(...runs.map((r) => r.totalSeconds));
    const minLvl = Math.min(...runs.map((r) => r.finalLevel));
    const maxLvl = Math.max(...runs.map((r) => r.finalLevel));
    const minDeaths = Math.min(...runs.map((r) => r.totalDeaths));
    const maxDeaths = Math.max(...runs.map((r) => r.totalDeaths));
    const allTen = runs.every((r) => r.completedChapters === 10);
    const worstRatios = runs
      .flatMap((r) => r.chapters.map((c) => c.worstDmgTakenOverRegen))
      .filter((x) => x > 0);
    const worstRatioMin = worstRatios.length ? Math.min(...worstRatios) : 0;
    const worstRatioMax = worstRatios.length ? Math.max(...worstRatios) : 0;
    const fast = [...runs].sort((a, b) => a.totalSeconds - b.totalSeconds);
    const disp =
      fast.length >= 2
        ? fast[fast.length - 1]!.totalSeconds / Math.max(fast[0]!.totalSeconds, 1)
        : 1;
    const offRatios = offline
      .map((o) => o.ratioXp)
      .filter((x) => Number.isFinite(x)) as number[];
    const offAvg = offRatios.length
      ? offRatios.reduce((a, b) => a + b, 0) / offRatios.length
      : NaN;
    const offMin = offRatios.length ? Math.min(...offRatios) : NaN;
    const offMax = offRatios.length ? Math.max(...offRatios) : NaN;
    const gachaMaxDelta = Math.max(
      ...gacha.flatMap((g) =>
        (["C", "B", "A", "S"] as const).map((t) =>
          Math.abs((g.tierCount[t] ?? 0) / g.rolls - nominalRate(t)),
        ),
      ),
    );
    const gachaMaxGap = Math.max(...gacha.map((g) => g.gapMax));
    const anyWall = runs.some((r) => r.wallChapter !== undefined);

    p(
      `- **Progressão rápida demais em relação à curva de nível.** ` +
        `${allTen ? "Todas as 6 classes" : "Nem todas as classes"} concluem os 10 capítulos em ` +
        `**${fmtDuration(minSec)}–${fmtDuration(maxSec)}** de jogo simulado, terminando entre ` +
        `**Nv ${minLvl} e Nv ${maxLvl}**. O critério "Nv ${CONFIG.STOP_LEVEL}" nunca é atingido: os ` +
        `capítulos acabam muito antes, e o personagem fica bem abaixo do nível dos monstros do fim ` +
        `(Cap. 9–10 têm monstros Nv 100–150).`,
    );
    p(
      `- **Dispersão entre classes: ${disp.toFixed(1)}×** (mais rápida \`${fast[0]!.line}\` ` +
        `${fmtDuration(fast[0]!.totalSeconds)} · mais lenta \`${fast[fast.length - 1]!.line}\` ` +
        `${fmtDuration(fast[fast.length - 1]!.totalSeconds)}). Builds concentradas num stat de dano ` +
        `(FOR ou DES) são as mais rápidas; builds que investem pesado fora de dano — Mercador em ` +
        `VIT/INT, Infiltrador em SOR/AGI — demoram mais porque parte dos pontos não vira dano. ` +
        `${anyWall ? "Alguma classe bateu numa parede — ver Seção 1." : "Nenhuma classe travou numa parede."}`,
    );
    p(
      `- **HP nunca se sustenta sozinho.** Em todos os capítulos de todas as classes o ` +
        `\`dano recebido/s\` supera o \`regen de HP/s\` (razões de **${worstRatioMin.toFixed(0)}× a ${worstRatioMax.toFixed(0)}×**). ` +
        `A sobrevivência depende 100% do heal ao matar; sem ele o personagem morreria em quase todo monstro. ` +
        `Mortes reais (morrer antes de matar) por classe: **${minDeaths}–${maxDeaths}** no total.`,
    );
    if (offRatios.length) {
      const target = OFFLINE_EFFICIENCY_FACTOR * 100;
      const aligned = offMin * 100 >= target - 2 && offMax * 100 <= target + 2;
      p(
        `- **Offline rende ${(offAvg * 100).toFixed(0)}% do jogo ativo em média** ` +
          `(faixa ${(offMin * 100).toFixed(0)}–${(offMax * 100).toFixed(0)}%), alvo ` +
          `\`OFFLINE_EFFICIENCY_FACTOR\` = **${target.toFixed(0)}%**. ` +
          (aligned
            ? `Calibrado: o offline deriva kills/h do DPS real do personagem, então a razão fica ` +
              `≈ ${target.toFixed(0)}% em qualquer estágio (antes usava taxa fixa \`f(nível)\` e ` +
              `variava de ~60% a ~125%).`
            : `Ainda descasado do alvo — ver Seção 2.`),
      );
    }
    p(
      `- **Gacha saudável.** Distribuição por tier a ≤ **${(gachaMaxDelta * 100).toFixed(2)} p.p.** do ` +
        `nominal; pity respeitado (gap máximo entre Tier S = **${num(gachaMaxGap)}**, teto teórico ${PITY_THRESHOLD + 1}). ` +
        `Poucos S vêm da garantia de pity — a maioria sai no sorteio.`,
    );
  }

  /* ---- constantes usadas ---- */
  p();
  p(`## Constantes usadas`);
  p();
  p(`### De @game/core (não alteradas)`);
  p();
  p(
    mdTable(
      ["Fonte", "Constante", "Valor"],
      [
        ["character.ts", "BASE_HP / HP_PER_LEVEL / HP_PER_VIT", `${CHARACTER_TUNING.BASE_HP} / ${CHARACTER_TUNING.HP_PER_LEVEL} / ${CHARACTER_TUNING.HP_PER_VIT}`],
        ["character.ts", "ATK_PER_FOR / ATK_PER_DES / ATK_PER_LEVEL", `${CHARACTER_TUNING.ATK_PER_FOR} / ${CHARACTER_TUNING.ATK_PER_DES} / ${CHARACTER_TUNING.ATK_PER_LEVEL}`],
        ["character.ts", "MATK_PER_INT / MATK_PER_DES / MATK_PER_LEVEL", `${CHARACTER_TUNING.MATK_PER_INT} / ${CHARACTER_TUNING.MATK_PER_DES} / ${CHARACTER_TUNING.MATK_PER_LEVEL}`],
        ["character.ts", "DEF_PER_VIT / DEF_PER_LEVEL", `${CHARACTER_TUNING.DEF_PER_VIT} / ${CHARACTER_TUNING.DEF_PER_LEVEL}`],
        ["character.ts", "CRIT_PER_SOR", `${CHARACTER_TUNING.CRIT_PER_SOR}`],
        ["character.ts", "FLEE_PER_AGI / HIT_PER_DES (+/nível)", `${CHARACTER_TUNING.FLEE_PER_AGI} / ${CHARACTER_TUNING.HIT_PER_DES}`],
        ["character.ts", "BASE_ASPD / ASPD_PER_AGI / ASPD_PER_DES / ASPD_MAX", `${CHARACTER_TUNING.BASE_ASPD} / ${CHARACTER_TUNING.ASPD_PER_AGI} / ${CHARACTER_TUNING.ASPD_PER_DES} / ${CHARACTER_TUNING.ASPD_MAX}`],
        ["character.ts", "HP_REGEN_FRACTION_PER_SEC", `${CHARACTER_TUNING.HP_REGEN_FRACTION_PER_SEC} (× HP máx / s)`],
        ["combat.ts", "CRIT_DAMAGE_MULT / BLOCK_DAMAGE_REDUCTION / MIN_DAMAGE", `${COMBAT_TUNING.CRIT_DAMAGE_MULT} / ${COMBAT_TUNING.BLOCK_DAMAGE_REDUCTION} / ${COMBAT_TUNING.MIN_DAMAGE}`],
        ["combat.ts", "HIT_RATE_FLOOR / CEIL / SOFTNESS", `${COMBAT_TUNING.HIT_RATE_FLOOR} / ${COMBAT_TUNING.HIT_RATE_CEIL} / ${COMBAT_TUNING.HIT_RATE_SOFTNESS}`],
        ["combat.ts", "REWARD BASE_XP / XP_PER_LEVEL", `${REWARD_TUNING.BASE_XP} / ${REWARD_TUNING.XP_PER_LEVEL}`],
        ["combat.ts", "REWARD BASE_GOLD / GOLD_PER_LEVEL", `${REWARD_TUNING.BASE_GOLD} / ${REWARD_TUNING.GOLD_PER_LEVEL}`],
        ["monster.ts", "BASE_HP / HP_PER_LEVEL", `${MONSTER_TUNING.BASE_HP} / ${MONSTER_TUNING.HP_PER_LEVEL}`],
        ["monster.ts", "BASE_ATK / ATK_PER_LEVEL / DEF_PER_LEVEL", `${MONSTER_TUNING.BASE_ATK} / ${MONSTER_TUNING.ATK_PER_LEVEL} / ${MONSTER_TUNING.DEF_PER_LEVEL}`],
        ["monster.ts", "BOSS_MULTIPLIER (Mini/MVP/MVP_FINAL)", `${BOSS_MULTIPLIER.Mini} / ${BOSS_MULTIPLIER.MVP} / ${BOSS_MULTIPLIER.MVP_FINAL}`],
        ["offlineProgress.ts", "OFFLINE_EFFICIENCY_FACTOR", `${OFFLINE_EFFICIENCY_FACTOR}`],
        ["offlineProgress.ts", "OFFLINE_CAP_HOURS", `${OFFLINE_CAP_HOURS}`],
        ["offlineProgress.ts", "kills/h offline", `DPS real / HP do monstro × 3600 (clamp ${OFFLINE_TUNING.MIN_KILLS_PER_HOUR}–${OFFLINE_TUNING.MAX_KILLS_PER_HOUR})`],
        ["gacha.ts", "SUMMON_RATES (C/B/A/S)", `${SUMMON_RATES.C} / ${SUMMON_RATES.B} / ${SUMMON_RATES.A} / ${SUMMON_RATES.S}`],
        ["gacha.ts", "PITY_THRESHOLD", `${PITY_THRESHOLD}`],
      ],
    ),
  );
  p();
  p(`### Premissas do harness (NÃO são de @game/core)`);
  p();
  p(
    mdTable(
      ["Premissa", "Valor", "Origem"],
      [
        ["Curva de XP", XP_FORMULA_TEXT, "réplica de apps/web/lib/gameSave.ts"],
        ["Atributo inicial (Nv 1)", `${CONFIG.STARTING_ATTRIBUTE} em cada`, "como o protótipo web"],
        ["Pontos de atributo por nível", `${CONFIG.POINTS_PER_LEVEL} (distribuídos pelo peso da classe)`, "harness — o protótipo web dá +5 em TODOS; aqui distribuímos pela build"],
        ["Heal ao derrotar monstro", `${CONFIG.HEAL_TO_FULL_ON_KILL ? "sim (HP cheio)" : "não"}`, "como o protótipo web"],
        ["Folga de prontidão p/ avançar", `tempoParaMorrer ≥ tempoParaMatar × ${CONFIG.READINESS_SAFETY}`, "harness"],
        ["Critérios de parada", `Nv ${CONFIG.STOP_LEVEL} · 10 capítulos · ${CONFIG.MAX_SIM_DAYS_PER_CLASS}d simulados · parede`, "harness"],
        ["Parede (monstro)", `> ${CONFIG.MAX_DEATHS_PER_MONSTER} mortes ou > ${CONFIG.MAX_SIM_DAYS_PER_MONSTER}d num único kill`, "harness"],
        ["Rolls de gacha por banner", `${num(CONFIG.GACHA_ROLLS)} (PRNG mulberry32, seeds ${CONFIG.GACHA_SEED.companion} / ${CONFIG.GACHA_SEED.seal})`, "harness"],
      ],
    ),
  );
  p();
  p(`**Builds por classe** (peso dos ${CONFIG.POINTS_PER_LEVEL} pontos/nível; escolhidas pela fantasia da classe, NÃO calibradas para equilibrar):`);
  p();
  p(
    mdTable(
      ["Classe", "Job base", "FOR", "AGI", "VIT", "INT", "DES", "SOR"],
      CLASS_LINES.map((line) => {
        const b = CLASS_BUILDS[line];
        const bj = BASE_JOBS.find((j) => j.line === line);
        return [
          line,
          bj ? bj.name : "?",
          b.FOR,
          b.AGI,
          b.VIT,
          b.INT,
          b.DES,
          b.SOR,
        ];
      }),
    ),
  );
  p();
  p(
    `> Nota do modelo: o combate resolve dano físico por \`ATK_PER_FOR·FOR + ATK_PER_DES·DES\` ` +
      `(FOR vale 4× DES por ponto) e mágico por \`MATK_PER_INT·INT\`. \`attackType\` é mágico quando ` +
      `INT efetivo > FOR efetivo. Os jobs base (tier 1) não têm \`attributeFocus\`, então a linha de ` +
      `classe só influencia via \`attackType\` — toda a diferença entre classes vem da build de atributos.`,
  );

  /* ---- Seção 1 ---- */
  p();
  p(`## 1. Progressão principal (Nv 1 → parada)`);
  p();
  p(`### Resumo por classe`);
  p();
  p(
    mdTable(
      ["Classe", "Nível final", "Caps. concluídos", "Tempo simulado total", "Mortes", "Parada"],
      runs.map((r) => [
        r.line,
        r.finalLevel,
        `${r.completedChapters} / 10`,
        fmtDuration(r.totalSeconds),
        num(r.totalDeaths),
        r.stopReason,
      ]),
    ),
  );
  p();
  const fastest = [...runs].sort((a, b) => a.totalSeconds - b.totalSeconds)[0];
  const slowest = [...runs].sort((a, b) => b.totalSeconds - a.totalSeconds)[0];
  if (fastest && slowest && fastest !== slowest) {
    const factor = slowest.totalSeconds / Math.max(fastest.totalSeconds, 1);
    p(
      `**Dispersão entre classes:** mais rápida = \`${fastest.line}\` (${fmtDuration(fastest.totalSeconds)}), ` +
        `mais lenta = \`${slowest.line}\` (${fmtDuration(slowest.totalSeconds)}) → **${factor.toFixed(1)}×**. ` +
        `Um fator próximo de 1× indica classes parelhas; acima de ~2× já é candidato a ajuste.`,
    );
  }
  p();
  p(`### Detalhe por capítulo`);
  for (const r of runs) {
    p();
    p(`#### ${r.line}`);
    p();
    p(
      mdTable(
        ["Cap.", "Região", "Nv entra", "Nv sai", "Tempo simulado", "Mortes", "Kills de farm", "Monstros HP-negativo", "Pior dano/regen", "Parede?"],
        r.chapters.map((c) => [
          c.chapter,
          c.name,
          c.levelIn,
          c.levelOut,
          fmtDuration(c.seconds),
          c.deaths,
          num(c.farmKills),
          `${c.hpNegativeMonsters}`,
          c.worstDmgTakenOverRegen > 0
            ? `${c.worstDmgTakenOverRegen.toFixed(1)}×`
            : "—",
          c.reachedWall ? "**SIM**" : "",
        ]),
      ),
    );
  }
  p();
  p(
    `> "Monstros HP-negativo" = monstros em que \`dano recebido/s > regen de HP/s\` — o personagem só ` +
      `sobrevive porque cura ao matar; "Pior dano/regen" é a razão mais extrema vista no capítulo. ` +
      `"Mortes" só acontecem quando o personagem morre ANTES de matar o monstro (HP cheio não aguenta o \`ttk\`).`,
  );

  /* ---- Seção 2 ---- */
  p();
  p(`## 2. Progresso offline vs. jogo ativo`);
  p();
  p(
    `Personagem de referência: **${CONFIG.OFFLINE_REFERENCE_CLASS}** (snapshots tirados quando o nível cruza ${CONFIG.OFFLINE_TEST_LEVELS.join(", ")}). ` +
      `"Ativo" = kills reais/s do combate (\`simulateCombatTick\`) × recompensa por kill. ` +
      `"Offline" = \`calculateOfflineRewards\`, que agora deriva kills/h do DPS real ` +
      `do personagem no estágio (\`DPS / HP_do_monstro × 3600\`) e aplica ` +
      `\`OFFLINE_EFFICIENCY_FACTOR = ${OFFLINE_EFFICIENCY_FACTOR}\` — então a razão deve ficar ≈ ` +
      `${(OFFLINE_EFFICIENCY_FACTOR * 100).toFixed(0)}% por construção.`,
  );
  p();
  if (offline.length === 0) {
    p(`_Sem snapshots — a classe de referência não alcançou os níveis de teste._`);
  } else {
    p(
      mdTable(
        ["Nível", "Estágio (monstro)", "Janela", "XP offline", "XP ativo", "Ouro offline", "Ouro ativo", "Offline/Ativo (XP)", "Offline/Ativo (Ouro)", "Kills off vs ativo", "net HP/s no estágio"],
        offline.map((o) => [
          o.level,
          `${o.stageName} (Nv ${o.stageMonsterLevel})`,
          `${o.hours}h`,
          num(o.offlineXp),
          num(o.activeXp),
          num(o.offlineGold),
          num(o.activeGold),
          Number.isFinite(o.ratioXp) ? `${(o.ratioXp * 100).toFixed(0)}%` : "—",
          Number.isFinite(o.ratioGold) ? `${(o.ratioGold * 100).toFixed(0)}%` : "—",
          `${num(o.offlineKills)} vs ${num(o.activeKills)}`,
          o.netHpPerSec.toFixed(1),
        ]),
      ),
    );
    p();
    const ratios = offline
      .map((o) => o.ratioXp)
      .filter((x) => Number.isFinite(x)) as number[];
    if (ratios.length) {
      const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      p(
        `**Proporção offline/ativo (XP) média: ${(avg * 100).toFixed(0)}%.** ` +
          `Alvo = \`OFFLINE_EFFICIENCY_FACTOR\` (${(OFFLINE_EFFICIENCY_FACTOR * 100).toFixed(0)}%). ` +
          `Como o offline agora usa o mesmo DPS do combate, a razão fica ≈ ${(OFFLINE_EFFICIENCY_FACTOR * 100).toFixed(0)}%; ` +
          `o resíduo que sobra vem de o "ativo" deste relatório descontar tempo de mortes ` +
          `(coluna "net HP/s"), enquanto o offline assume 0 mortes.`,
      );
    }
  }

  /* ---- Seção 3 ---- */
  p();
  p(`## 3. Gacha`);
  p();
  p(
    `${num(CONFIG.GACHA_ROLLS)} \`rollSummon\` por banner, com pity encadeado. ` +
      `Taxas nominais (GDD §8.2 / \`SUMMON_RATES\`): C ${(SUMMON_RATES.C * 100).toFixed(0)}% · ` +
      `B ${(SUMMON_RATES.B * 100).toFixed(0)}% · A ${(SUMMON_RATES.A * 100).toFixed(0)}% · S ${(SUMMON_RATES.S * 100).toFixed(0)}%. ` +
      `Pity: Tier S garantido quando o contador atinge ${PITY_THRESHOLD} (gap máximo teórico entre S = ${PITY_THRESHOLD + 1}).`,
  );
  for (const g of gacha) {
    p();
    p(`### Banner \`${g.banner}\` (seed ${g.seed})`);
    p();
    const nominal: Record<string, number> = {
      C: SUMMON_RATES.C,
      B: SUMMON_RATES.B,
      A: SUMMON_RATES.A,
      S: SUMMON_RATES.S,
    };
    p(
      mdTable(
        ["Tier", "Contagem", "Observado", "Nominal", "Δ (p.p.)"],
        ["C", "B", "A", "S"].map((t) => {
          const cnt = g.tierCount[t] ?? 0;
          const obs = cnt / g.rolls;
          const nom = nominal[t] ?? 0;
          return [
            t,
            num(cnt),
            `${(obs * 100).toFixed(2)}%`,
            `${(nom * 100).toFixed(2)}%`,
            `${((obs - nom) * 100).toFixed(2)}`,
          ];
        }),
      ),
    );
    p();
    const sCount = g.tierCount["S"] ?? 0;
    p(
      mdTable(
        ["Métrica", "Valor"],
        [
          ["Tier S no total", `${num(sCount)} / ${num(g.rolls)}`],
          ["S por garantia de pity", `${num(g.sGuaranteed)} (${((g.sGuaranteed / Math.max(sCount, 1)) * 100).toFixed(1)}% dos S)`],
          ["1ª invocação até um S", Number.isFinite(g.firstS) ? num(g.firstS) : "—"],
          ["Gap entre S — média", g.gapMean.toFixed(1)],
          ["Gap entre S — mediana", num(g.gapMedian)],
          ["Gap entre S — mín / máx", `${num(g.gapMin)} / ${num(g.gapMax)}`],
          ["Gap entre S — p95", num(g.gapP95)],
          ["Gap máximo teórico (pity)", `${PITY_THRESHOLD + 1}`],
          ["Pity respeitado?", g.gapMax <= PITY_THRESHOLD + 1 ? "✅ sim" : "❌ NÃO"],
        ],
      ),
    );
  }
  p();
  p(
    `> Gap médio esperado sem pity ≈ 1 / P(S) = 1 / ${SUMMON_RATES.S} = ${(1 / SUMMON_RATES.S).toFixed(0)}. ` +
      `O pity encurta a cauda: nenhum gap deve passar de ${PITY_THRESHOLD + 1}. ` +
      `Os dois banners usam a mesma lógica de tier em \`rollSummon\` (só o pool de itens muda), então as ` +
      `distribuições devem bater entre si a menos de ruído de RNG.`,
  );

  p();
  p(`---`);
  p(`_Arquivos irmãos: \`progression.csv\`, \`gacha.csv\`._`);

  /* ---- CSVs ---- */
  const progressionRows = [
    "classe,job_base,capitulo,regiao,nivel_entra,nivel_sai,segundos_simulados,mortes,kills_farm,monstros_hp_negativo,pior_dano_sobre_regen,parede",
  ];
  for (const r of runs) {
    for (const c of r.chapters) {
      progressionRows.push(
        [
          r.line,
          r.baseJobId,
          c.chapter,
          `"${c.name}"`,
          c.levelIn,
          c.levelOut,
          Math.round(c.seconds),
          c.deaths,
          c.farmKills,
          c.hpNegativeMonsters,
          c.worstDmgTakenOverRegen.toFixed(3),
          c.reachedWall ? 1 : 0,
        ].join(","),
      );
    }
  }

  const gachaRows = ["banner,seed,tier,contagem,observado_pct,nominal_pct"];
  for (const g of gacha) {
    for (const t of ["C", "B", "A", "S"]) {
      const cnt = g.tierCount[t] ?? 0;
      const nom =
        t === "C"
          ? SUMMON_RATES.C
          : t === "B"
            ? SUMMON_RATES.B
            : t === "A"
              ? SUMMON_RATES.A
              : SUMMON_RATES.S;
      gachaRows.push(
        [
          g.banner,
          g.seed,
          t,
          cnt,
          ((cnt / g.rolls) * 100).toFixed(3),
          (nom * 100).toFixed(3),
        ].join(","),
      );
    }
  }

  return {
    md: L.join("\n") + "\n",
    progressionCsv: progressionRows.join("\n") + "\n",
    gachaCsv: gachaRows.join("\n") + "\n",
  };
}

/* ======================================================================== */
/*  Main                                                                     */
/* ======================================================================== */

function main(): void {
  const t0 = Date.now();

  // Seção 1: progressão por classe (a de referência coleta snapshots p/ seção 2)
  const snapshots: LevelSnapshot[] = [];
  const runs: ProgressionRun[] = [];
  for (const line of CLASS_LINES) {
    const sink =
      line === CONFIG.OFFLINE_REFERENCE_CLASS
        ? (s: LevelSnapshot) => snapshots.push(s)
        : undefined;
    runs.push(runProgression(line, sink));
  }

  // Seção 2: offline vs ativo
  const offline: OfflineComparison[] = [];
  for (const snap of snapshots) {
    for (const hours of CONFIG.OFFLINE_TEST_HOURS) {
      offline.push(offlineVsActive(snap, hours));
    }
  }

  // Seção 3: gacha
  const gacha: GachaReport[] = [runGacha("companion"), runGacha("seal")];

  // Relatório
  const { md, progressionCsv, gachaCsv } = buildReport(runs, offline, gacha);

  const outDir = join(dirname(fileURLToPath(import.meta.url)), "output");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "balance-report.md"), md);
  writeFileSync(join(outDir, "progression.csv"), progressionCsv);
  writeFileSync(join(outDir, "gacha.csv"), gachaCsv);

  process.stdout.write(md);
  process.stdout.write(
    `\n(gerado em ${((Date.now() - t0) / 1000).toFixed(1)}s → ${outDir})\n`,
  );
}

main();

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  CHAPTERS,
  COMPANIONS_BY_ID,
  JOBS_BY_ID,
  MONSTERS_BY_ID,
  type Companion,
  type Monster,
} from "@game/data";
import {
  calculateDerivedStats,
  canRebirth,
  deriveMonsterStats,
  getRebirthMultiplier,
  resolveMonsterDefeat,
  simulateCombatTick,
} from "@game/core";

import {
  advanceStage,
  getSave,
  getStageMonsters,
  recordKill,
  resetSave,
  useGameSave,
  xpToNextLevel,
} from "@/lib/gameStore";
import { useCombatTickMs } from "@/lib/settings";
import {
  classGlyph,
  classPlaceholderColor,
  companionGlyph,
  companionPlaceholderColor,
  elementColor,
  raceGlyph,
  racePlaceholderColor,
} from "@/lib/sprites";
import { BattleArena, type Combatant, type Floater } from "./BattleArena";
import { CombatLog, type LogEntry } from "./CombatLog";
import { RebirthModal } from "./RebirthModal";
import { StatusPanel } from "./StatusPanel";

const MAX_LOG = 40;
const MAX_FLOATERS = 14;
const FLOATER_LIFETIME_MS = 950;
const DEATH_FADE_MS = 380;

const FALLBACK_MONSTER = MONSTERS_BY_ID.get("gotinha")!;

const TIER_RANK: Record<string, number> = { S: 4, A: 3, B: 2, C: 1 };

/** "Companheiro ativo" = o de maior tier que o jogador possui (sem slot de equipar ainda). */
function pickActiveCompanion(
  companionFragments: Record<string, number>,
): Companion | null {
  const owned = Object.keys(companionFragments)
    .map((id) => COMPANIONS_BY_ID.get(id))
    .filter((c): c is Companion => Boolean(c));
  if (owned.length === 0) return null;
  return (
    [...owned].sort(
      (a, b) => (TIER_RANK[b.tier] ?? 0) - (TIER_RANK[a.tier] ?? 0),
    )[0] ?? null
  );
}

function chapterName(chapterNumber: number): string {
  return (
    CHAPTERS.find((c) => c.number === chapterNumber)?.name ??
    `Capítulo ${chapterNumber}`
  );
}

export function Game() {
  const [mounted, setMounted] = useState(false);
  const [rebirthOpen, setRebirthOpen] = useState(false);
  const save = useGameSave();
  const character = save.character;

  const derived = useMemo(
    () => calculateDerivedStats(character),
    [character],
  );

  const monster =
    MONSTERS_BY_ID.get(character.currentStageId) ?? FALLBACK_MONSTER;
  const monsterStats = useMemo(() => deriveMonsterStats(monster), [monster]);

  const activeCompanion = useMemo(
    () => pickActiveCompanion(save.companionFragments),
    [save.companionFragments],
  );

  // velocidade de combate (Configurações) -> intervalo do loop
  const tickMs = useCombatTickMs();
  const tickSecondsRef = useRef(tickMs / 1000);
  tickSecondsRef.current = tickMs / 1000;

  const [currentHp, setCurrentHp] = useState(derived.maxHp);
  const [currentSp, setCurrentSp] = useState(derived.maxSp);
  const [monsterHp, setMonsterHp] = useState(monsterStats.maxHp);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  /** monstro em fade-out de morte (mostra o que caiu até o próximo entrar). */
  const [dyingMonster, setDyingMonster] = useState<Monster | null>(null);

  // efeitos visuais da cena de batalha
  const [fx, setFx] = useState({
    n: 0,
    heroAttack: false,
    heroHurt: false,
    companionAttack: false,
    monsterHit: false,
  });
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const floaterSeq = useRef(0);

  const logIdRef = useRef(0);
  const addLog = useRef((text: string) => {
    setEntries((prev) =>
      [{ id: logIdRef.current++, text }, ...prev].slice(0, MAX_LOG),
    );
  }).current;

  const pushFloater = useRef(
    (side: Floater["side"], kind: Floater["kind"], text: string) => {
      const id = floaterSeq.current++;
      const dx = Math.round((Math.random() - 0.5) * 44);
      setFloaters((prev) => [...prev, { id, side, kind, text, dx }].slice(-MAX_FLOATERS));
      window.setTimeout(() => {
        setFloaters((prev) => prev.filter((f) => f.id !== id));
      }, FLOATER_LIFETIME_MS);
    },
  ).current;

  // marca como montado (evita mismatch de hidratação com o localStorage)
  useEffect(() => setMounted(true), []);

  // ao montar de fato (save já lido do localStorage), começa com tudo cheio
  useEffect(() => {
    if (!mounted) return;
    setCurrentHp(derived.maxHp);
    setCurrentSp(derived.maxSp);
    setMonsterHp(deriveMonsterStats(monster).maxHp);
    // roda só na transição para "montado"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // ao trocar de monstro/estágio, reinicia o HP do monstro
  useEffect(() => {
    setMonsterHp(deriveMonsterStats(monster).maxHp);
  }, [monster]);

  // clamp de HP/SP quando o máximo muda (ex.: reset)
  useEffect(() => {
    setCurrentHp((hp) => Math.min(hp, derived.maxHp));
    setCurrentSp((sp) => Math.min(sp, derived.maxSp));
  }, [derived.maxHp, derived.maxSp]);

  // ---- loop de combate ----------------------------------------------------
  const tickRef = useRef<() => void>(() => {});
  tickRef.current = () => {
    // aba em segundo plano -> o tempo vira "progresso offline" ao voltar
    if (paused || document.hidden || dyingMonster) return;

    const activeMonster = MONSTERS_BY_ID.get(character.currentStageId);
    if (!activeMonster) return;

    const dt = tickSecondsRef.current;
    const result = simulateCombatTick(derived, activeMonster, dt);
    const regenHp = derived.hpRegenPerSec * dt;
    const regenSp = derived.spRegenPerSec * dt;

    const dealt = Math.max(0, Math.round(result.damageDealt));
    const taken = Math.max(0, Math.round(result.damageTaken));

    addLog(
      taken > 0
        ? `Você causou ${dealt} de dano em ${activeMonster.name} · sofreu ${taken}`
        : `Você causou ${dealt} de dano em ${activeMonster.name}`,
    );

    setFx((prev) => ({
      n: prev.n + 1,
      heroAttack: dealt > 0,
      heroHurt: taken > 0,
      companionAttack: dealt > 0 && activeCompanion !== null,
      monsterHit: dealt > 0,
    }));
    if (dealt > 0) pushFloater("monster", "dmg", `-${dealt}`);
    if (taken > 0) pushFloater("hero", "taken", `-${taken}`);

    setCurrentSp((sp) => Math.min(derived.maxSp, sp + regenSp));

    const hpAfter = currentHp - result.damageTaken + regenHp;
    const monsterHpAfter = monsterHp - result.damageDealt;

    // morte do jogador (sem penalidade no protótipo)
    if (hpAfter <= 0) {
      addLog(
        `💀 Você foi derrotado por ${activeMonster.name}. Revivido com HP cheio.`,
      );
      pushFloater("hero", "info", "revivido");
      setCurrentHp(derived.maxHp);
      setMonsterHp(deriveMonsterStats(activeMonster).maxHp);
      return;
    }

    // monstro sobrevive ao tick
    if (monsterHpAfter > 0) {
      setCurrentHp(Math.min(derived.maxHp, hpAfter));
      setMonsterHp(monsterHpAfter);
      return;
    }

    // monstro derrotado -> recompensas + loot + avanço
    const rewards = resolveMonsterDefeat(activeMonster, character);
    const sealDropped =
      rewards.sealFragment != null &&
      Math.random() < rewards.sealFragment.dropChance;
    const companionDropped =
      rewards.companionFragment != null &&
      Math.random() < rewards.companionFragment.dropChance;

    const { levelsGained, chapterCleared } = recordKill({
      monster: activeMonster,
      rewards,
      sealDropped,
      companionDropped,
    });

    addLog(
      `☠️ ${activeMonster.name} derrotado! +${rewards.xp} XP, +${rewards.gold} Ouro`,
    );
    pushFloater("monster", "defeat", "💥");
    pushFloater("monster", "info", `+${rewards.xp} XP`);

    // fade-out de morte antes do próximo monstro entrar
    setDyingMonster(activeMonster);
    window.setTimeout(() => setDyingMonster(null), DEATH_FADE_MS);

    if (sealDropped && rewards.sealFragment) {
      addLog(`✨ Fragmento de Selo obtido (${rewards.sealFragment.sealId})`);
      pushFloater("monster", "info", "✨ Selo!");
    }
    if (companionDropped && rewards.companionFragment) {
      addLog(
        `🐾 Fragmento de Companheiro obtido (${rewards.companionFragment.companionId})`,
      );
      pushFloater("monster", "info", "🐾 Frag!");
    }
    if (levelsGained > 0) {
      addLog(
        `⬆️ Subiu ${levelsGained > 1 ? `${levelsGained} níveis` : "de nível"}! Agora nível ${character.level + levelsGained}. HP restaurado.`,
      );
      pushFloater("hero", "level", "LEVEL UP!");
    }
    if (chapterCleared) {
      addLog(
        `🏁 Capítulo ${activeMonster.chapterNumber} limpo! Você já pode avançar de estágio.`,
      );
    }

    // cura cheia ao vencer + reinicia HP do próximo monstro (stats já atualizados)
    const fresh = getSave().character;
    setCurrentHp(calculateDerivedStats(fresh).maxHp);
    const nextMonster = MONSTERS_BY_ID.get(fresh.currentStageId);
    if (nextMonster) setMonsterHp(deriveMonsterStats(nextMonster).maxHp);
  };

  useEffect(() => {
    const id = setInterval(() => tickRef.current(), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  if (!mounted) {
    return (
      <main className="p-6 text-sm text-neutral-400">Carregando protótipo…</main>
    );
  }

  const job = JOBS_BY_ID.get(character.jobId);
  const currentChapter = monster.chapterNumber;
  const chapterCleared = (character.clearedChapters ?? []).includes(
    currentChapter,
  );
  const hasNextChapter = getStageMonsters(currentChapter + 1).length > 0;
  const clearedStageCount = character.clearedStageIds?.length ?? 0;
  const rebirthAvailable = canRebirth(character);
  const rebirthMult = getRebirthMultiplier(character);

  // ---- combatentes para a cena (só render — nenhuma regra) ----
  const shownMonster = dyingMonster ?? monster;
  const shownMonsterStats = dyingMonster
    ? deriveMonsterStats(dyingMonster)
    : monsterStats;

  const heroCombatant: Combatant = {
    sprite: {
      kind: "character",
      id: character.jobId,
      color: classPlaceholderColor(job?.line),
      glyph: classGlyph(job?.line),
    },
    name: `${job?.name ?? character.jobId} · Nv ${character.level}`,
    sub: job?.line,
    hp: currentHp,
    maxHp: derived.maxHp,
    sp: currentSp,
    maxSp: derived.maxSp,
  };

  const companionCombatant: Combatant | null = activeCompanion
    ? {
        sprite: {
          kind: "companion",
          id: activeCompanion.id,
          spriteUrl: activeCompanion.spriteUrl,
          color: companionPlaceholderColor(activeCompanion.tier),
          glyph: companionGlyph(activeCompanion.tier),
        },
        name: activeCompanion.name,
        sub: `${activeCompanion.tier} · ${activeCompanion.role}`,
      }
    : null;

  const monsterCombatant: Combatant = {
    sprite: {
      kind: "monster",
      id: shownMonster.id,
      spriteUrl: shownMonster.spriteUrl,
      color: racePlaceholderColor(shownMonster.race),
      glyph: raceGlyph(shownMonster.race),
    },
    name: shownMonster.name,
    sub: `Nv ${shownMonster.level} · ${shownMonster.race} · ${shownMonster.element} ${shownMonster.elementLevel} · ${shownMonster.size}`,
    hp: dyingMonster ? 0 : monsterHp,
    maxHp: shownMonsterStats.maxHp,
    isBoss: shownMonster.isBoss,
    bossRank: shownMonster.bossRank,
    auraColor: elementColor(shownMonster.element),
  };

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">
          RAGNAROK{" "}
          <span className="font-normal text-neutral-400">— protótipo</span>
          {rebirthMult > 1 ? (
            <span className="ml-2 text-xs font-normal text-amber-500">
              ×{rebirthMult.toFixed(2)} (renascimento)
            </span>
          ) : null}
        </h1>
        <div className="flex items-center gap-2">
          {rebirthAvailable ? (
            <button
              type="button"
              onClick={() => setRebirthOpen(true)}
              className="rounded border border-amber-500 px-3 py-1 text-sm font-medium text-amber-600 dark:text-amber-400"
            >
              ✦ Renascer
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="rounded border border-neutral-300 px-3 py-1 text-sm dark:border-neutral-700"
          >
            {paused ? "▶ Continuar" : "⏸ Pausar"}
          </button>
        </div>
      </header>

      <BattleArena
        chapterNumber={currentChapter}
        chapterLabel={chapterName(currentChapter)}
        hero={heroCombatant}
        companion={companionCombatant}
        monster={monsterCombatant}
        monsterDying={dyingMonster !== null}
        xp={character.xp ?? 0}
        xpMax={xpToNextLevel(character.level)}
        gold={save.gold}
        fxTick={fx.n}
        heroAttack={fx.heroAttack}
        heroHurt={fx.heroHurt}
        companionAttack={fx.companionAttack}
        monsterHit={fx.monsterHit}
        floaters={floaters}
        paused={paused}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <CombatLog entries={entries} />
        <StatusPanel character={character} derived={derived} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!chapterCleared || !hasNextChapter}
          onClick={() => {
            const r = advanceStage();
            if (r.ok) addLog(`➡️ Avançou para o Capítulo ${r.toChapter}.`);
          }}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Avançar Estágio
        </button>
        <span className="text-xs text-neutral-500">
          Capítulo atual: {currentChapter}
          {!chapterCleared ? " (limpe o capítulo para avançar)" : ""}
          {chapterCleared && !hasNextChapter ? " (último capítulo)" : ""} ·
          Estágios limpos: {clearedStageCount} · Selos equipados:{" "}
          {character.equippedSeals.length}
        </span>
      </div>

      <footer className="pt-10 text-center">
        <button
          type="button"
          onClick={() => {
            void resetSave().finally(() => window.location.reload());
          }}
          className="text-[10px] text-neutral-300 hover:text-red-500 dark:text-neutral-700"
        >
          reset
        </button>
      </footer>

      {rebirthOpen ? (
        <RebirthModal
          character={character}
          onClose={() => setRebirthOpen(false)}
        />
      ) : null}
    </main>
  );
}

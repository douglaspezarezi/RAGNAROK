"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { deriveMonsterStats } from "@game/core";

import { Countdown } from "@/components/Countdown";
import {
  getMeta,
  isHydrated,
  recordWeeklyBossWin,
  useGameSave,
} from "@/lib/gameStore";
import { characterDisplayName } from "@/lib/leaderboard";
import { toast } from "@/lib/toast";
import type { WeeklyBossAttemptRow, WeeklyBossRow } from "@/lib/supabase/types";
import {
  ATTEMPT_SECONDS,
  MAX_ATTEMPTS_PER_DAY,
  bestPerPlayer,
  boostedBossMonster,
  countAttemptsToday,
  fetchBossAttempts,
  fetchCurrentWeeklyBoss,
  runBossAttempt,
  submitBossAttempt,
  weeklyBossMonster,
  type BossRankingRow,
} from "@/lib/weeklyBoss";

type Load = "loading" | "ready" | "error";

export function WeeklyBossScreen() {
  const save = useGameSave();
  const [load, setLoad] = useState<Load>("loading");
  const [boss, setBoss] = useState<WeeklyBossRow | null>(null);
  const [attempts, setAttempts] = useState<WeeklyBossAttemptRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<{
    damage: number;
    wouldKill: boolean;
  } | null>(null);

  const meta = getMeta();
  const selfPlayerId = meta?.playerId ?? null;

  const refresh = useCallback(async () => {
    setLoad("loading");
    try {
      const b = await fetchCurrentWeeklyBoss();
      setBoss(b);
      setAttempts(b ? await fetchBossAttempts(b.id) : []);
      setLoad("ready");
    } catch {
      setLoad("error");
    }
  }, []);

  useEffect(() => {
    if (!isHydrated()) return;
    void refresh();
  }, [refresh]);

  const baseMonster = boss ? weeklyBossMonster(boss) : null;

  const boostedStats = useMemo(() => {
    if (!boss || !baseMonster) return null;
    const boosted = boostedBossMonster(baseMonster, boss.boosted_stats_multiplier);
    return { boosted, stats: deriveMonsterStats(boosted) };
  }, [boss, baseMonster]);

  const ranking: BossRankingRow[] = useMemo(
    () => bestPerPlayer(attempts),
    [attempts],
  );
  const selfRankIdx = selfPlayerId
    ? ranking.findIndex((r) => r.playerId === selfPlayerId)
    : -1;

  const usedToday = selfPlayerId
    ? countAttemptsToday(attempts, selfPlayerId)
    : 0;
  const attemptsLeft = Math.max(0, MAX_ATTEMPTS_PER_DAY - usedToday);

  async function attempt() {
    if (!boss || !baseMonster || !selfPlayerId || busy) return;
    if (attemptsLeft <= 0) {
      toast.error("Você já usou suas tentativas de hoje. Volte amanhã.");
      return;
    }
    setBusy(true);
    try {
      const result = runBossAttempt(baseMonster, boss.boosted_stats_multiplier);
      const ok = await submitBossAttempt(
        selfPlayerId,
        boss.id,
        characterDisplayName(save.character.jobId),
        result.damage,
      );
      if (!ok) {
        toast.error("Não foi possível registrar a tentativa. Tente de novo.");
        return;
      }
      setLastResult({ damage: result.damage, wouldKill: result.wouldKill });
      toast.success(
        `Tentativa registrada: ${result.damage.toLocaleString("pt-BR")} de dano.`,
      );
      if (result.wouldKill) recordWeeklyBossWin(); // marco -> conquista
      setAttempts(await fetchBossAttempts(boss.id));
    } finally {
      setBusy(false);
    }
  }

  if (!isHydrated()) {
    return (
      <main className="p-6 text-sm text-neutral-400">
        Carregando chefe da semana…
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Chefe da Semana</h1>
          <p className="text-xs text-neutral-500">
            Uma tentativa simula {ATTEMPT_SECONDS}s de combate contra o MVP
            reforçado, usando seu personagem atual. Ranqueia por dano causado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
        >
          Atualizar
        </button>
      </header>

      {load === "loading" ? (
        <p className="text-sm text-neutral-400">Carregando…</p>
      ) : load === "error" ? (
        <p className="rounded border border-red-500/40 p-4 text-sm text-red-500">
          Erro ao carregar. Tente{" "}
          <button type="button" onClick={() => void refresh()} className="underline">
            de novo
          </button>
          .
        </p>
      ) : !boss ? (
        <p className="rounded border border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800">
          Nenhum chefe semanal definido no momento. Volte mais tarde — ou defina
          um manualmente na tabela <code>weekly_boss</code>.
        </p>
      ) : !baseMonster ? (
        <p className="rounded border border-amber-500/40 p-4 text-sm text-amber-600">
          O chefe configurado (<code>{boss.monster_id}</code>) não existe no
          bestiário. Corrija o <code>monster_id</code> em <code>weekly_boss</code>.
        </p>
      ) : (
        <>
          <section className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {baseMonster.name}{" "}
                <span className="text-xs font-normal text-neutral-400">
                  · {baseMonster.race} · {baseMonster.element}{" "}
                  {baseMonster.elementLevel} · Nv base {baseMonster.level}
                </span>
              </h2>
              <Countdown
                target={boss.week_end}
                prefix="Encerra em "
                className="text-xs font-medium text-amber-600"
                onExpire={() => void refresh()}
              />
            </div>

            <p className="text-sm">
              Reforço:{" "}
              <strong>×{boss.boosted_stats_multiplier}</strong> nos status
              {boostedStats ? (
                <>
                  {" "}
                  — HP ≈{" "}
                  <strong>
                    {boostedStats.stats.maxHp.toLocaleString("pt-BR")}
                  </strong>
                  , ATQ ≈{" "}
                  <strong>
                    {boostedStats.stats.atk.toLocaleString("pt-BR")}
                  </strong>
                </>
              ) : null}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={busy || attemptsLeft <= 0}
                onClick={() => void attempt()}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Combatendo…" : "Tentar agora"}
              </button>
              <span className="text-xs text-neutral-500">
                Tentativas hoje: {usedToday}/{MAX_ATTEMPTS_PER_DAY}
                {attemptsLeft <= 0 ? " · volte amanhã" : ""}
              </span>
            </div>

            {lastResult ? (
              <p className="rounded bg-neutral-100 p-2 text-xs dark:bg-neutral-900">
                Última tentativa:{" "}
                <strong>
                  {lastResult.damage.toLocaleString("pt-BR")}
                </strong>{" "}
                de dano{" "}
                {lastResult.wouldKill
                  ? "— derrubaria o chefe! 💥"
                  : "— não foi o bastante para derrubá-lo."}
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400">
              Ranking da semana (maior dano)
            </h2>
            {ranking.length === 0 ? (
              <p className="rounded border border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800">
                Ninguém tentou ainda. Seja o primeiro!
              </p>
            ) : (
              <ol className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
                {ranking.slice(0, 100).map((r, i) => (
                  <li
                    key={r.playerId}
                    className={`flex items-center gap-3 px-3 py-2 ${
                      r.playerId === selfPlayerId ? "bg-blue-500/10" : ""
                    }`}
                  >
                    <span className="w-10 shrink-0 text-right font-mono text-xs text-neutral-400">
                      #{i + 1}
                    </span>
                    <span className="flex-1 truncate">
                      <span className="font-medium">{r.characterName}</span>{" "}
                      <span className="text-xs text-neutral-400">
                        · {r.attempts} tentativa(s)
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs">
                      {r.bestDamage.toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {selfRankIdx >= 100 ? (
              <p className="text-xs text-neutral-500">
                Sua melhor marca: #{selfRankIdx + 1} ·{" "}
                {ranking[selfRankIdx].bestDamage.toLocaleString("pt-BR")} de dano.
              </p>
            ) : null}
          </section>
        </>
      )}
    </main>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

import { getMeta, isHydrated, useGameSave } from "@/lib/gameStore";
import { fetchLeaderboard, type LeaderboardView } from "@/lib/leaderboard";
import { progressLabel, stageProgressIndex } from "@/lib/progress";
import type { LeaderboardStageRow } from "@/lib/supabase/types";

type Load = "loading" | "ready" | "error";

export function LeaderboardScreen() {
  const save = useGameSave();
  const [load, setLoad] = useState<Load>("loading");
  const [view, setView] = useState<LeaderboardView | null>(null);

  const meta = getMeta();
  const selfPlayerId = meta?.playerId ?? null;

  const refresh = useCallback(async () => {
    setLoad("loading");
    const v = await fetchLeaderboard(selfPlayerId);
    if (!v) {
      setLoad("error");
      return;
    }
    setView(v);
    setLoad("ready");
  }, [selfPlayerId]);

  useEffect(() => {
    if (!isHydrated()) return;
    void refresh();
  }, [refresh]);

  if (!isHydrated()) {
    return (
      <main className="p-6 text-sm text-neutral-400">Carregando ranking…</main>
    );
  }

  // fallback local: se o jogador ainda não aparece no ranking (primeiro save
  // ainda não propagou), mostra a posição prevista pelos próprios dados.
  const localSelf: LeaderboardStageRow = {
    player_id: selfPlayerId ?? "self",
    character_name: "Você",
    job_id: save.character.jobId,
    progress_index: stageProgressIndex(save.character.currentStageId),
    level: save.character.level,
    updated_at: new Date().toISOString(),
  };

  const inTop =
    view?.self != null && view.self.rank <= (view.top.length || 100);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Ranking de Estágio</h1>
          <p className="text-xs text-neutral-500">
            Progresso na campanha principal — mais avançado primeiro. Cada linha
            é uma &ldquo;fotografia&rdquo; salva quando o jogador grava progresso.
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
          Não foi possível carregar o ranking agora. Tente{" "}
          <button
            type="button"
            onClick={() => void refresh()}
            className="underline"
          >
            de novo
          </button>
          .
        </p>
      ) : !view || view.totalPlayers === 0 ? (
        <div className="space-y-3">
          <p className="rounded border border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800">
            Ninguém no ranking ainda. Jogue alguns segundos na aba{" "}
            <strong>Combate</strong> — seu progresso é gravado no ranking
            automaticamente no próximo save.
          </p>
          <SelfRow rank={1} row={localSelf} highlight predicted />
        </div>
      ) : (
        <>
          <ol className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
            {view.top.map((row, i) => (
              <Row
                key={row.player_id}
                rank={i + 1}
                row={row}
                highlight={row.player_id === selfPlayerId}
              />
            ))}
          </ol>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Sua posição
            </p>
            {view.self ? (
              inTop ? (
                <p className="text-sm text-neutral-500">
                  Você está em <strong>#{view.self.rank}</strong> — destacado na
                  lista acima.
                </p>
              ) : (
                <SelfRow
                  rank={view.self.rank}
                  row={view.self.row}
                  highlight
                />
              )
            ) : (
              <SelfRow rank={view.totalPlayers + 1} row={localSelf} highlight predicted />
            )}
            <p className="pt-1 text-xs text-neutral-400">
              {view.totalPlayers} jogador(es) no ranking.
            </p>
          </div>
        </>
      )}
    </main>
  );
}

function Row({
  rank,
  row,
  highlight,
}: {
  rank: number;
  row: LeaderboardStageRow;
  highlight?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-3 px-3 py-2 ${
        highlight ? "bg-blue-500/10" : ""
      }`}
    >
      <span className="w-10 shrink-0 text-right font-mono text-xs text-neutral-400">
        #{rank}
      </span>
      <span className="flex-1 truncate">
        <span className="font-medium">{row.character_name}</span>{" "}
        <span className="text-xs text-neutral-400">
          · Nv {row.level} · {shortId(row.player_id)}
        </span>
      </span>
      <span className="shrink-0 text-xs text-neutral-500">
        {progressLabel(row.progress_index)}
      </span>
    </li>
  );
}

function SelfRow({
  rank,
  row,
  highlight,
  predicted,
}: {
  rank: number;
  row: LeaderboardStageRow;
  highlight?: boolean;
  predicted?: boolean;
}) {
  return (
    <ol className="rounded-lg border border-blue-500/40 text-sm">
      <Row rank={rank} row={row} highlight={highlight} />
      {predicted ? (
        <li className="px-3 pb-2 text-[11px] text-neutral-400">
          Posição prevista pelos seus dados locais — confirma no próximo save.
        </li>
      ) : null}
    </ol>
  );
}

/** Sufixo curto e estável do uuid do jogador, só para diferenciar linhas. */
function shortId(playerId: string): string {
  return `jogador-${playerId.replace(/-/g, "").slice(0, 4)}`;
}

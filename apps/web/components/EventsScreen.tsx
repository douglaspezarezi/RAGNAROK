"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Countdown } from "@/components/Countdown";
import {
  getMeta,
  grantExclusiveReward,
  isHydrated,
} from "@/lib/gameStore";
import {
  eventRewardLabel,
  fetchActiveEvents,
  fetchEventProgress,
  markEventRewardClaimed,
  resolveEventMonsters,
  saveEventProgress,
} from "@/lib/events";
import type { EventRow, PlayerEventProgressRow } from "@/lib/supabase/types";
import { toast } from "@/lib/toast";
import { useCombatLoop } from "@/lib/useCombatLoop";

type Load = "loading" | "ready" | "error";

/** A cada quantos kills o progresso é gravado no Supabase. */
const FLUSH_EVERY_KILLS = 5;

interface Baseline {
  eventId: string;
  kills: number;
  damage: number;
}

export function EventsScreen() {
  const [load, setLoad] = useState<Load>("loading");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [progress, setProgress] = useState<
    Map<string, PlayerEventProgressRow>
  >(new Map());
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  const playerId = getMeta()?.playerId ?? null;

  const refresh = useCallback(async () => {
    if (!playerId) return;
    setLoad("loading");
    try {
      const evs = await fetchActiveEvents();
      setEvents(evs);
      setProgress(
        await fetchEventProgress(
          playerId,
          evs.map((e) => e.id),
        ),
      );
      setLoad("ready");
    } catch {
      setLoad("error");
    }
  }, [playerId]);

  useEffect(() => {
    if (!isHydrated()) return;
    void refresh();
  }, [refresh]);

  // ---- combate do evento selecionado ---------------------------------------
  const activeEvent = events.find((e) => e.id === activeEventId) ?? null;

  const activeMonsters = useMemo(
    () => (activeEvent ? resolveEventMonsters(activeEvent.stage_override) : []),
    [activeEvent],
  );

  // baseline = progresso já persistido quando esta sessão de combate começou
  const baselineRef = useRef<Baseline | null>(null);
  const pendingRef = useRef<{ kills: number; damage: number }>({
    kills: 0,
    damage: 0,
  });

  const flush = useCallback(async () => {
    const base = baselineRef.current;
    if (!playerId || !base) return;
    const kills = base.kills + pendingRef.current.kills;
    const damage = base.damage + pendingRef.current.damage;
    const ok = await saveEventProgress(playerId, base.eventId, kills, damage);
    if (ok) {
      setProgress((prev) => {
        const next = new Map(prev);
        const existing = next.get(base.eventId);
        next.set(base.eventId, {
          id: existing?.id ?? "",
          player_id: playerId,
          event_id: base.eventId,
          progress_data: { kills, damage },
          reward_claimed: existing?.reward_claimed ?? false,
          updated_at: new Date().toISOString(),
        });
        return next;
      });
    }
  }, [playerId]);

  const combat = useCombatLoop({
    monsters: activeMonsters,
    active: activeEventId !== null && activeMonsters.length > 0,
    onKill: (kills, totalDamage) => {
      pendingRef.current = { kills, damage: totalDamage };
      if (kills % FLUSH_EVERY_KILLS === 0) void flush();
    },
  });

  function startCombat(ev: EventRow) {
    const row = progress.get(ev.id);
    baselineRef.current = {
      eventId: ev.id,
      kills: row?.progress_data.kills ?? 0,
      damage: row?.progress_data.damage ?? 0,
    };
    pendingRef.current = { kills: 0, damage: 0 };
    setActiveEventId(ev.id);
  }

  const stopCombat = useCallback(async () => {
    await flush();
    baselineRef.current = null;
    pendingRef.current = { kills: 0, damage: 0 };
    setActiveEventId(null);
  }, [flush]);

  // grava o que estiver pendente ao esconder a aba / desmontar
  useEffect(() => {
    if (activeEventId === null) return;
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      void flush();
    };
  }, [activeEventId, flush]);

  async function claim(ev: EventRow) {
    if (!playerId || claiming) return;
    setClaiming(ev.id);
    try {
      const ok = await grantExclusiveReward(
        ev.exclusive_reward_type,
        ev.exclusive_reward_id,
      );
      if (!ok) {
        toast.error("Falha ao entregar a recompensa. Tente de novo.");
        return;
      }
      await markEventRewardClaimed(playerId, ev.id);
      setProgress((prev) => {
        const next = new Map(prev);
        const existing = next.get(ev.id);
        if (existing) next.set(ev.id, { ...existing, reward_claimed: true });
        return next;
      });
      toast.success("Recompensa exclusiva resgatada! Confira em Invocar/Equipar.");
    } finally {
      setClaiming(null);
    }
  }

  if (!isHydrated()) {
    return (
      <main className="p-6 text-sm text-neutral-400">Carregando eventos…</main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Eventos</h1>
          <p className="text-xs text-neutral-500">
            Estágios especiais por tempo limitado. Critério:{" "}
            <strong>derrote a meta de monstros do evento</strong> para levar a
            recompensa exclusiva. O combate usa as mesmas regras da campanha.
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
          Erro ao carregar os eventos. Tente{" "}
          <button type="button" onClick={() => void refresh()} className="underline">
            de novo
          </button>
          .
        </p>
      ) : events.length === 0 ? (
        <p className="rounded border border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800">
          Nenhum evento ativo no momento. Novos eventos aparecem aqui
          automaticamente quando entram no ar.
        </p>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => {
            const row = progress.get(ev.id);
            const persistedKills = row?.progress_data.kills ?? 0;
            const isActive = activeEventId === ev.id;
            const liveKills = isActive
              ? (baselineRef.current?.kills ?? 0) + combat.kills
              : persistedKills;
            const goalReached = liveKills >= ev.completion_goal;
            const claimed = row?.reward_claimed ?? false;
            const monsters = resolveEventMonsters(ev.stage_override);
            const broken = monsters.length === 0;

            return (
              <li
                key={ev.id}
                className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">{ev.name}</h2>
                  <Countdown
                    target={ev.ends_at}
                    className="text-xs font-medium text-amber-600"
                    onExpire={() => void refresh()}
                  />
                </div>

                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  {ev.description}
                </p>

                <p className="text-xs">
                  <span className="text-neutral-400">Recompensa exclusiva: </span>
                  <strong>
                    {eventRewardLabel(
                      ev.exclusive_reward_type,
                      ev.exclusive_reward_id,
                    )}
                  </strong>
                </p>

                <div>
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>
                      Progresso: {Math.min(liveKills, ev.completion_goal)} /{" "}
                      {ev.completion_goal} monstros
                    </span>
                    {claimed ? (
                      <span className="font-medium text-emerald-600">
                        recompensa resgatada ✓
                      </span>
                    ) : goalReached ? (
                      <span className="font-medium text-amber-600">
                        meta concluída!
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className="h-full bg-amber-500 transition-[width] duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          (liveKills / ev.completion_goal) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {broken ? (
                  <p className="text-xs text-amber-600">
                    Configuração de estágio inválida (nenhum monstro resolvido).
                    Revise <code>stage_override</code> deste evento.
                  </p>
                ) : isActive ? (
                  <div className="space-y-2 rounded bg-neutral-100 p-3 text-xs dark:bg-neutral-900">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Alvo: <strong>{combat.monster?.name ?? "—"}</strong>
                      </span>
                      <span>
                        HP monstro:{" "}
                        {Math.max(0, Math.ceil(combat.monsterHp))}/
                        {combat.monsterMaxHp}
                      </span>
                      <span>
                        Seu HP: {Math.max(0, Math.ceil(combat.heroHp))}/
                        {combat.heroMaxHp}
                      </span>
                      <span>
                        Kills nesta sessão: <strong>{combat.kills}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void stopCombat()}
                      className="rounded border border-neutral-300 px-3 py-1 dark:border-neutral-700"
                    >
                      ⏹ Sair do evento (salva o progresso)
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={activeEventId !== null}
                      onClick={() => startCombat(ev)}
                      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Participar
                    </button>
                    {activeEventId !== null ? (
                      <span className="text-xs text-neutral-400">
                        Saia do outro evento para entrar neste.
                      </span>
                    ) : null}
                  </div>
                )}

                {goalReached && !claimed ? (
                  <button
                    type="button"
                    disabled={claiming === ev.id}
                    onClick={() => void claim(ev)}
                    className="w-full rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    {claiming === ev.id
                      ? "Entregando…"
                      : "Resgatar recompensa exclusiva"}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

"use client";

/**
 * Eventos Temporários (GDD 8.5) — resolução do estágio do evento + I/O Supabase.
 *
 * As REGRAS DE COMBATE continuam 100% em `@game/core`: aqui só montamos a lista
 * de `Monster` do evento (a partir do bestiário, com overrides) e lemos/gravamos
 * o progresso. O critério de conclusão é simples: "derrote N monstros do evento"
 * (`events.completion_goal`), contado em `progress_data.kills`.
 */

import {
  BATTLE_SEALS_BY_ID,
  COMPANIONS_BY_ID,
  MONSTERS_BY_ID,
  type Monster,
} from "@game/data";
import { getMonstersByChapter } from "@game/core";

import { getSupabase } from "./supabase/client";
import type {
  EventRow,
  EventStageOverride,
  PlayerEventProgressRow,
} from "./supabase/types";

function logError(context: string, error: unknown): void {
  // eslint-disable-next-line no-console
  console.error(`[events] ${context}:`, error);
}

/* -------------------------------------------------------------------------- */
/*  Resolução do estágio do evento                                             */
/* -------------------------------------------------------------------------- */

/**
 * Monstros do evento como objetos `Monster` (mesma forma de `@game/data`), aptos
 * a entrar em `simulateCombatTick` / `deriveMonsterStats` sem qualquer mudança
 * em `@game/core`.
 *
 * - `stage_override.chapterNumber` -> pega os comuns daquele capítulo
 * - `stage_override.monsters` -> cada item usa um monstro do bestiário como
 *   molde (`baseId`) + overrides (`name`, `level`, `isBoss`, `bossRank`)
 * - `stage_override.levelMultiplier` -> escala o nível efetivo (afeta HP/ATQ)
 */
export function resolveEventMonsters(override: EventStageOverride): Monster[] {
  const mult =
    typeof override.levelMultiplier === "number" && override.levelMultiplier > 0
      ? override.levelMultiplier
      : 1;

  const scaleLevel = (lvl: number): number =>
    Math.max(1, Math.round(lvl * mult));

  let base: Monster[] = [];

  if (Array.isArray(override.monsters) && override.monsters.length > 0) {
    base = override.monsters
      .map((spec): Monster | null => {
        const template = MONSTERS_BY_ID.get(spec.baseId);
        if (!template) return null;
        const isBoss = spec.isBoss ?? template.isBoss;
        return {
          ...template,
          name: spec.name ?? template.name,
          level: spec.level ?? template.level,
          isBoss,
          bossRank: isBoss ? (spec.bossRank ?? template.bossRank) : undefined,
        };
      })
      .filter((m): m is Monster => m !== null);
  } else if (typeof override.chapterNumber === "number") {
    base = getMonstersByChapter(override.chapterNumber).filter((m) => !m.isBoss);
  }

  return base.map((m) => ({ ...m, level: scaleLevel(m.level) }));
}

/** Nome legível da recompensa exclusiva. */
export function eventRewardLabel(
  type: EventRow["exclusive_reward_type"],
  id: string,
): string {
  if (type === "companion") {
    const c = COMPANIONS_BY_ID.get(id);
    return c ? `Companheiro · ${c.name} (Tier ${c.tier})` : `Companheiro · ${id}`;
  }
  const s = BATTLE_SEALS_BY_ID.get(id);
  return s ? `Selo · ${s.name} (${s.rarity})` : `Selo · ${id}`;
}

/* -------------------------------------------------------------------------- */
/*  I/O Supabase                                                               */
/* -------------------------------------------------------------------------- */

/** Eventos ativos agora (`is_active` e `starts_at <= now <= ends_at`). */
export async function fetchActiveEvents(): Promise<EventRow[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await getSupabase()
    .from("events")
    .select("*")
    .eq("is_active", true)
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso)
    .order("ends_at", { ascending: true });

  if (error) {
    logError("fetchActiveEvents", error);
    throw error;
  }
  return (data ?? []) as EventRow[];
}

/** Progresso do jogador nos eventos dados, indexado por `event_id`. */
export async function fetchEventProgress(
  playerId: string,
  eventIds: string[],
): Promise<Map<string, PlayerEventProgressRow>> {
  const out = new Map<string, PlayerEventProgressRow>();
  if (eventIds.length === 0) return out;

  const { data, error } = await getSupabase()
    .from("player_event_progress")
    .select("*")
    .eq("player_id", playerId)
    .in("event_id", eventIds);

  if (error) {
    logError("fetchEventProgress", error);
    throw error;
  }
  for (const row of (data ?? []) as PlayerEventProgressRow[]) {
    out.set(row.event_id, row);
  }
  return out;
}

/** Grava o progresso acumulado (kills/dano). Upsert por (player_id, event_id). */
export async function saveEventProgress(
  playerId: string,
  eventId: string,
  kills: number,
  damage: number,
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("player_event_progress")
    .upsert(
      {
        player_id: playerId,
        event_id: eventId,
        progress_data: { kills, damage },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "player_id,event_id" },
    );
  if (error) {
    logError("saveEventProgress", error);
    return false;
  }
  return true;
}

/** Marca a recompensa como resgatada. Chame só depois de conceder o item. */
export async function markEventRewardClaimed(
  playerId: string,
  eventId: string,
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("player_event_progress")
    .upsert(
      {
        player_id: playerId,
        event_id: eventId,
        reward_claimed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "player_id,event_id" },
    );
  if (error) {
    logError("markEventRewardClaimed", error);
    return false;
  }
  return true;
}

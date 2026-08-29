"use client";

/**
 * Camada de persistência Supabase: traduz entre linhas do banco e `GameSave`,
 * e faz as operações assíncronas (carregar, salvar, registrar sessão offline).
 *
 * O cliente Supabase é usado sem tipagem gerada; as linhas são moldadas aqui
 * pelos tipos de `supabase/types.ts`. Qualquer erro de rede/Supabase vira
 * `toast.error` — o jogador nunca perde progresso em silêncio.
 */

import type { OfflineRewardsSummary } from "@game/core";

import {
  createInitialCharacter,
  createInitialSave,
  INITIAL_SUMMON_CRYSTALS,
  type GameSave,
  SAVE_VERSION,
} from "./gameSave";
import { upsertLeaderboardStage } from "./leaderboard";
import { getSupabase } from "./supabase/client";
import type {
  AchievementRow,
  CharacterProgress,
  CharacterRow,
  PlayerAchievementRow,
  PlayerCompanionRow,
  PlayerSealRow,
  PlayerSettings,
} from "./supabase/types";
import { toast } from "./toast";

const FRESH_PITY = { companion: 0, seal: 0 };

/** Metadados necessários para salvar depois. */
export interface LoadedBundle {
  playerId: string;
  characterId: string;
  /** `last_seen_at` do banco, em epoch ms. */
  lastSeenAtMs: number;
  save: GameSave;
  /** `players.tutorial_completed` — controla o onboarding. */
  tutorialCompleted: boolean;
  /** `players.settings` (som/música/velocidade). */
  settings: Partial<PlayerSettings>;
  /** Catálogo de conquistas. */
  achievements: AchievementRow[];
  /** Conquistas que o jogador já desbloqueou. */
  unlockedAchievementIds: string[];
}

export interface SaveTarget {
  playerId: string;
  characterId: string;
}

function logError(context: string, error: unknown): void {
  // eslint-disable-next-line no-console
  console.error(`[persistence] ${context}:`, error);
}

/* -------------------------------------------------------------------------- */
/*  Tradução linhas <-> GameSave                                               */
/* -------------------------------------------------------------------------- */

function progressOf(row: CharacterRow): Required<CharacterProgress> {
  const p = row.progress ?? {};
  return {
    rebirthCount: p.rebirthCount ?? 0,
    clearedChapters: p.clearedChapters ?? [],
    clearedStageIds: p.clearedStageIds ?? [],
    totalKills: p.totalKills ?? 0,
    weeklyBossWins: p.weeklyBossWins ?? 0,
    eventRewardsClaimed: p.eventRewardsClaimed ?? 0,
  };
}

function rowsToGameSave(
  character: CharacterRow,
  companions: PlayerCompanionRow[],
  seals: PlayerSealRow[],
): GameSave {
  const progress = progressOf(character);
  const base = character.base_attributes ?? {};
  const equippedSeals = character.equipped_seals ?? {};
  const pity = character.summon_pity ?? {};
  return {
    version: SAVE_VERSION,
    character: {
      level: character.level,
      jobId: character.job_id,
      xp: character.xp,
      baseAttributes: {
        FOR: base.FOR ?? 0,
        AGI: base.AGI ?? 0,
        VIT: base.VIT ?? 0,
        INT: base.INT ?? 0,
        DES: base.DES ?? 0,
        SOR: base.SOR ?? 0,
      },
      currentStageId: character.current_stage_id,
      equippedSeals: Object.values(equippedSeals),
      rebirthCount: progress.rebirthCount,
      clearedChapters: progress.clearedChapters,
      clearedStageIds: progress.clearedStageIds,
    },
    gold: Number(character.gold ?? 0),
    sealFragments: Object.fromEntries(seals.map((s) => [s.seal_id, s.fragments])),
    companionFragments: Object.fromEntries(
      companions.map((c) => [c.companion_id, c.fragments]),
    ),
    equippedSeals,
    summonCrystals: Number(character.summon_crystals ?? INITIAL_SUMMON_CRYSTALS),
    summonPity: { companion: pity.companion ?? 0, seal: pity.seal ?? 0 },
    totalKills: progress.totalKills,
    milestones: {
      weeklyBossWins: progress.weeklyBossWins,
      eventRewardsClaimed: progress.eventRewardsClaimed,
    },
  };
}

function progressFromSave(save: GameSave): Required<CharacterProgress> {
  const c = save.character;
  return {
    rebirthCount: c.rebirthCount ?? 0,
    clearedChapters: c.clearedChapters ?? [],
    clearedStageIds: c.clearedStageIds ?? [],
    totalKills: save.totalKills ?? 0,
    weeklyBossWins: save.milestones?.weeklyBossWins ?? 0,
    eventRewardsClaimed: save.milestones?.eventRewardsClaimed ?? 0,
  };
}

/** Colunas de `characters` a partir do `GameSave`. */
function characterColumnsFromSave(save: GameSave): Record<string, unknown> {
  const c = save.character;
  return {
    job_id: c.jobId,
    level: c.level,
    xp: c.xp ?? 0,
    gold: save.gold,
    current_stage_id: c.currentStageId,
    base_attributes: c.baseAttributes,
    progress: progressFromSave(save),
    equipped_seals: save.equippedSeals,
    summon_crystals: save.summonCrystals,
    summon_pity: save.summonPity,
    updated_at: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/*  Onboarding: garante player + character                                     */
/* -------------------------------------------------------------------------- */

async function ensurePlayer(authUserId: string): Promise<string | null> {
  const supabase = getSupabase();

  const existing = await supabase
    .from("players")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (existing.error) {
    logError("ensurePlayer.select", existing.error);
    toast.error("Erro ao carregar seu perfil.");
    return null;
  }
  if (existing.data) return (existing.data as { id: string }).id;

  // fallback caso o trigger on_auth_user_created não esteja instalado
  const inserted = await supabase
    .from("players")
    .insert({ auth_user_id: authUserId })
    .select("id")
    .single();

  if (inserted.error) {
    logError("ensurePlayer.insert", inserted.error);
    toast.error("Erro ao criar seu perfil.");
    return null;
  }
  return (inserted.data as { id: string }).id;
}

async function ensureCharacter(playerId: string): Promise<string | null> {
  const supabase = getSupabase();

  const existing = await supabase
    .from("characters")
    .select("id")
    .eq("player_id", playerId)
    .maybeSingle();

  if (existing.error) {
    logError("ensureCharacter.select", existing.error);
    toast.error("Erro ao carregar seu personagem.");
    return null;
  }
  if (existing.data) return (existing.data as { id: string }).id;

  const initial = createInitialCharacter();
  const inserted = await supabase
    .from("characters")
    .insert({
      player_id: playerId,
      job_id: initial.jobId,
      level: initial.level,
      xp: initial.xp ?? 0,
      gold: 0,
      current_stage_id: initial.currentStageId,
      base_attributes: initial.baseAttributes,
      progress: {
        rebirthCount: 0,
        clearedChapters: [],
        clearedStageIds: [],
        totalKills: 0,
        weeklyBossWins: 0,
        eventRewardsClaimed: 0,
      } satisfies CharacterProgress,
      equipped_seals: {},
      summon_crystals: INITIAL_SUMMON_CRYSTALS,
      summon_pity: FRESH_PITY,
    })
    .select("id")
    .single();

  if (inserted.error) {
    logError("ensureCharacter.insert", inserted.error);
    toast.error("Erro ao criar seu personagem.");
    return null;
  }
  return (inserted.data as { id: string }).id;
}

/* -------------------------------------------------------------------------- */
/*  Load                                                                       */
/* -------------------------------------------------------------------------- */

export async function loadBundle(
  authUserId: string,
): Promise<LoadedBundle | null> {
  const supabase = getSupabase();

  const playerId = await ensurePlayer(authUserId);
  if (!playerId) return null;
  const characterId = await ensureCharacter(playerId);
  if (!characterId) return null;

  const [charRes, playerRes, companionsRes, sealsRes, achRes, playerAchRes] =
    await Promise.all([
      supabase.from("characters").select("*").eq("id", characterId).single(),
      supabase
        .from("players")
        .select("last_seen_at, tutorial_completed, settings")
        .eq("id", playerId)
        .single(),
      supabase.from("player_companions").select("*").eq("player_id", playerId),
      supabase.from("player_seals").select("*").eq("player_id", playerId),
      supabase.from("achievements").select("*"),
      supabase
        .from("player_achievements")
        .select("achievement_id")
        .eq("player_id", playerId),
    ]);

  const err =
    charRes.error || playerRes.error || companionsRes.error || sealsRes.error;
  if (err) {
    logError("loadBundle", err);
    toast.error("Erro ao carregar seu progresso.");
    return null;
  }
  // conquistas são secundárias — se falharem, o jogo carrega mesmo assim
  if (achRes.error) logError("loadBundle.achievements", achRes.error);
  if (playerAchRes.error)
    logError("loadBundle.player_achievements", playerAchRes.error);

  const player = playerRes.data as {
    last_seen_at: string;
    tutorial_completed: boolean;
    settings: Partial<PlayerSettings> | null;
  };

  return {
    playerId,
    characterId,
    lastSeenAtMs: new Date(player.last_seen_at).getTime(),
    save: rowsToGameSave(
      charRes.data as CharacterRow,
      (companionsRes.data ?? []) as PlayerCompanionRow[],
      (sealsRes.data ?? []) as PlayerSealRow[],
    ),
    tutorialCompleted: player.tutorial_completed ?? false,
    settings: player.settings ?? {},
    achievements: (achRes.data ?? []) as AchievementRow[],
    unlockedAchievementIds: (
      (playerAchRes.data ?? []) as Pick<PlayerAchievementRow, "achievement_id">[]
    ).map((r) => r.achievement_id),
  };
}

/* -------------------------------------------------------------------------- */
/*  Save                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Persiste o `GameSave` inteiro: `characters` + upsert de fragmentos de
 * Selos/Companheiros + `players.last_seen_at`. Retorna `true` em sucesso.
 */
export async function saveBundle(
  target: SaveTarget,
  save: GameSave,
): Promise<boolean> {
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();

  // upsert de todas as chaves: a existência da linha = "o jogador possui o item"
  // (mesmo com 0 fragmentos, ex.: item novo vindo do gacha).
  const sealRows = Object.entries(save.sealFragments).map(
    ([seal_id, fragments]) => ({
      player_id: target.playerId,
      seal_id,
      fragments,
    }),
  );
  const companionRows = Object.entries(save.companionFragments).map(
    ([companion_id, fragments]) => ({
      player_id: target.playerId,
      companion_id,
      fragments,
    }),
  );

  try {
    const results = await Promise.all([
      supabase
        .from("characters")
        .update(characterColumnsFromSave(save))
        .eq("id", target.characterId),
      supabase
        .from("players")
        .update({ last_seen_at: nowIso })
        .eq("id", target.playerId),
      sealRows.length > 0
        ? supabase
            .from("player_seals")
            .upsert(sealRows, { onConflict: "player_id,seal_id" })
        : Promise.resolve({ error: null }),
      companionRows.length > 0
        ? supabase
            .from("player_companions")
            .upsert(companionRows, { onConflict: "player_id,companion_id" })
        : Promise.resolve({ error: null }),
    ]);

    const failed = results.find((r) => r.error);
    if (failed?.error) {
      logError("saveBundle", failed.error);
      toast.error("Erro ao salvar progresso. Tentando de novo em breve.");
      return false;
    }

    // "fotografia" para o Ranking de Estágio — mesmo momento do save, best-effort.
    void upsertLeaderboardStage(target.playerId, save);
    return true;
  } catch (e) {
    logError("saveBundle.throw", e);
    toast.error("Erro de rede ao salvar progresso.");
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*  Onboarding, configurações e conquistas                                     */
/* -------------------------------------------------------------------------- */

/** Marca `players.tutorial_completed = true` (concluir/pular o tutorial). */
export async function setTutorialCompleted(playerId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("players")
    .update({ tutorial_completed: true })
    .eq("id", playerId);
  if (error) logError("setTutorialCompleted", error);
}

/** Persiste `players.settings` (som/música/velocidade de combate). */
export async function savePlayerSettings(
  playerId: string,
  settings: PlayerSettings,
): Promise<void> {
  const { error } = await getSupabase()
    .from("players")
    .update({ settings })
    .eq("id", playerId);
  if (error) {
    logError("savePlayerSettings", error);
    toast.error("Não foi possível salvar as preferências.");
  }
}

/** Registra uma conquista desbloqueada. `true` em sucesso (ou se já existia). */
export async function insertPlayerAchievement(
  playerId: string,
  achievementId: string,
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("player_achievements")
    .upsert(
      { player_id: playerId, achievement_id: achievementId },
      { onConflict: "player_id,achievement_id", ignoreDuplicates: true },
    );
  if (error) {
    logError("insertPlayerAchievement", error);
    return false;
  }
  return true;
}

/** Atualiza só `players.last_seen_at = now` (quando não há mudança de estado). */
export async function touchLastSeen(playerId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("players")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", playerId);
  if (error) logError("touchLastSeen", error);
}

/** Registra uma sessão offline para auditoria futura. */
export async function insertOfflineSession(
  characterId: string,
  startedAtMs: number,
  endedAtMs: number,
  summary: OfflineRewardsSummary,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("offline_sessions").insert({
    character_id: characterId,
    started_at: new Date(startedAtMs).toISOString(),
    ended_at: new Date(endedAtMs).toISOString(),
    rewards_summary: summary,
  });
  if (error) {
    logError("insertOfflineSession", error);
    toast.error("Progresso offline aplicado, mas não registrado no histórico.");
  }
}

/** Best-effort `last_seen_at = now` ao esconder/fechar a aba (com keepalive). */
export function touchLastSeenBeacon(playerId: string): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return;
  try {
    void getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        const token = data.session?.access_token;
        if (!token) return;
        void fetch(`${url}/rest/v1/players?id=eq.${playerId}`, {
          method: "PATCH",
          keepalive: true,
          headers: {
            apikey: anon,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ last_seen_at: new Date().toISOString() }),
        }).catch(() => {});
      });
  } catch {
    /* best effort */
  }
}

/** Reseta o personagem para o estado inicial e apaga fragmentos. */
export async function resetCharacter(target: SaveTarget): Promise<boolean> {
  const supabase = getSupabase();
  const initial = createInitialCharacter();

  try {
    const results = await Promise.all([
      supabase
        .from("characters")
        .update({
          job_id: initial.jobId,
          level: initial.level,
          xp: initial.xp ?? 0,
          gold: 0,
          current_stage_id: initial.currentStageId,
          base_attributes: initial.baseAttributes,
          progress: {
            rebirthCount: 0,
            clearedChapters: [],
            clearedStageIds: [],
          } satisfies CharacterProgress,
          equipped_seals: {},
          summon_crystals: INITIAL_SUMMON_CRYSTALS,
          summon_pity: FRESH_PITY,
          updated_at: new Date().toISOString(),
        })
        .eq("id", target.characterId),
      supabase.from("player_seals").delete().eq("player_id", target.playerId),
      supabase
        .from("player_companions")
        .delete()
        .eq("player_id", target.playerId),
    ]);

    const failed = results.find((r) => r.error);
    if (failed?.error) {
      logError("resetCharacter", failed.error);
      toast.error("Erro ao reiniciar o personagem.");
      return false;
    }

    // reflete o reset no Ranking de Estágio
    void upsertLeaderboardStage(target.playerId, createInitialSave());
    return true;
  } catch (e) {
    logError("resetCharacter.throw", e);
    toast.error("Erro de rede ao reiniciar o personagem.");
    return false;
  }
}

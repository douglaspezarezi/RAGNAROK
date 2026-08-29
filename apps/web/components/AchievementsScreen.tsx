"use client";

import { achievementProgress, useAchievements } from "@/lib/achievements";
import { eventRewardLabel } from "@/lib/events";
import { isHydrated, useGameSave } from "@/lib/gameStore";

export function AchievementsScreen() {
  const save = useGameSave();
  const { defs, unlocked } = useAchievements();

  if (!isHydrated()) {
    return (
      <main className="p-6 text-sm text-neutral-400">
        Carregando conquistas…
      </main>
    );
  }

  const rows = defs.map((def) => ({
    def,
    prog: achievementProgress(def, save, unlocked),
  }));
  const unlockedCount = rows.filter((r) => r.prog.unlocked).length;

  // desbloqueadas primeiro, depois as mais perto de completar
  const sorted = [...rows].sort((a, b) => {
    if (a.prog.unlocked !== b.prog.unlocked) return a.prog.unlocked ? -1 : 1;
    const ra = a.prog.current / a.prog.target;
    const rb = b.prog.current / b.prog.target;
    return rb - ra;
  });

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-bold">Conquistas</h1>
        <p className="text-xs text-neutral-500">
          {unlockedCount} / {defs.length} desbloqueadas. As recompensas são
          entregues automaticamente ao desbloquear.
        </p>
      </header>

      {defs.length === 0 ? (
        <p className="rounded border border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800">
          Catálogo de conquistas indisponível. Rode a migration
          <code> 20260829150000_qol_tutorial_settings_achievements.sql</code> e
          recarregue.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {sorted.map(({ def, prog }) => (
            <li
              key={def.id}
              className={`rounded-lg border p-3 text-sm ${
                prog.unlocked
                  ? "border-amber-500/50 bg-amber-500/5"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={`font-medium ${
                    prog.unlocked ? "" : "text-neutral-500"
                  }`}
                >
                  {prog.unlocked ? "🏆 " : "🔒 "}
                  {def.name}
                </span>
                {prog.unlocked ? (
                  <span className="text-[10px] font-bold uppercase text-amber-600">
                    desbloqueada
                  </span>
                ) : prog.complete ? (
                  <span className="text-[10px] font-bold uppercase text-emerald-600">
                    concluída — registrando…
                  </span>
                ) : null}
              </div>

              <p
                className={`mt-1 text-xs ${
                  prog.unlocked
                    ? "text-neutral-600 dark:text-neutral-300"
                    : "text-neutral-400"
                }`}
              >
                {def.description}
              </p>

              {!prog.unlocked && prog.showBar ? (
                <div className="mt-2">
                  <div className="flex justify-between text-[11px] text-neutral-400">
                    <span>
                      {Math.min(prog.current, prog.target).toLocaleString(
                        "pt-BR",
                      )}{" "}
                      / {prog.target.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (prog.current / prog.target) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {def.reward_type && def.reward_id ? (
                <p className="mt-2 text-[11px] text-neutral-400">
                  Recompensa: {eventRewardLabel(def.reward_type, def.reward_id)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

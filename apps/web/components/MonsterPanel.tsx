import type { Monster } from "@game/data";

import { Bar } from "./Bar";

export function MonsterPanel({
  monster,
  chapterName,
  currentHp,
  maxHp,
}: {
  monster: Monster;
  chapterName: string;
  currentHp: number;
  maxHp: number;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">
          {monster.name}
          {monster.isBoss ? (
            <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
              {monster.bossRank}
            </span>
          ) : null}
        </h2>
        <span className="text-sm text-neutral-500">Nível {monster.level}</span>
      </div>

      <p className="mt-1 text-xs text-neutral-500">
        Cap. {monster.chapterNumber} — {chapterName} · {monster.race} ·{" "}
        {monster.element} {monster.elementLevel} · {monster.size}
      </p>

      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-xs text-neutral-500">
          <span>HP</span>
          <span>
            {Math.max(0, Math.ceil(currentHp))} / {maxHp}
          </span>
        </div>
        <Bar value={currentHp} max={maxHp} className="bg-rose-500" />
      </div>
    </section>
  );
}

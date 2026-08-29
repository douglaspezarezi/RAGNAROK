import type { ReactNode } from "react";

import { Bar } from "./Bar";

export function CharacterPanel({
  jobName,
  jobLine,
  level,
  xp,
  xpToNext,
  currentHp,
  maxHp,
  currentSp,
  maxSp,
  gold,
}: {
  jobName: string;
  jobLine?: string;
  level: number;
  xp: number;
  xpToNext: number;
  currentHp: number;
  maxHp: number;
  currentSp: number;
  maxSp: number;
  gold: number;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">
          {jobName}
          {jobLine ? (
            <span className="ml-2 text-xs font-normal text-neutral-400">
              · {jobLine}
            </span>
          ) : null}
        </h2>
        <span className="text-sm text-neutral-500">Nível {level}</span>
      </div>

      <div className="mt-3 space-y-2">
        <Labeled label="XP" value={`${Math.floor(xp)} / ${xpToNext}`}>
          <Bar value={xp} max={xpToNext} className="bg-violet-500" />
        </Labeled>
        <Labeled label="HP" value={`${Math.ceil(currentHp)} / ${maxHp}`}>
          <Bar value={currentHp} max={maxHp} className="bg-emerald-500" />
        </Labeled>
        <Labeled label="SP" value={`${Math.ceil(currentSp)} / ${maxSp}`}>
          <Bar value={currentSp} max={maxSp} className="bg-sky-500" />
        </Labeled>
      </div>

      <p className="mt-3 text-sm">
        Ouro: <span className="font-medium">{gold}</span>
      </p>
    </section>
  );
}

function Labeled({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-neutral-500">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      {children}
    </div>
  );
}

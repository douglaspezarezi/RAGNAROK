import { BATTLE_SEALS_BY_ID } from "@game/data";
import type { CharacterState, DerivedStats } from "@game/core";

const BASE_ATTR_KEYS = ["FOR", "AGI", "VIT", "INT", "DES", "SOR"] as const;

export function StatusPanel({
  character,
  derived,
}: {
  character: CharacterState;
  derived: DerivedStats;
}) {
  const derivedRows: [string, string | number][] = [
    ["HP máx", derived.maxHp],
    ["SP máx", derived.maxSp],
    ["ATQ", derived.atk],
    ["ATQ.M", derived.matk],
    ["DEF", derived.def],
    ["DEF.M", derived.mdef],
    ["Crítico", `${derived.critChance}%`],
    ["Esquiva", derived.flee],
    ["Acerto", derived.hit],
    ["ASPD", `${derived.aspd}/s`],
    ["Bloqueio", `${derived.blockChance}%`],
    ["Ataque", `${derived.attackType === "magical" ? "Mágico" : "Físico"} (${derived.attackElement})`],
  ];

  return (
    <section className="space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-semibold">Status</h2>

      <div>
        <h3 className="text-xs uppercase tracking-wide text-neutral-400">
          Atributos base
        </h3>
        <div className="mt-1 grid grid-cols-3 gap-1 text-sm">
          {BASE_ATTR_KEYS.map((key) => (
            <div
              key={key}
              className="flex justify-between rounded bg-neutral-100 px-2 py-1 dark:bg-neutral-800"
            >
              <span className="text-neutral-500">{key}</span>
              <span className="font-medium">{character.baseAttributes[key]}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wide text-neutral-400">
          Status derivados
        </h3>
        <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
          {derivedRows.map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <dt className="text-neutral-500">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wide text-neutral-400">
          Selos equipados
        </h3>
        {character.equippedSeals.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-400">Nenhum selo equipado.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-sm">
            {character.equippedSeals.map((id) => {
              const seal = BATTLE_SEALS_BY_ID.get(id);
              return (
                <li key={id}>
                  {seal?.name ?? id}
                  {seal ? (
                    <span className="text-xs text-neutral-400">
                      {" "}
                      — {seal.mainEffect}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

"use client";

import {
  BATTLE_SEALS_BY_ID,
  type BattleSeal,
  type EquipmentSlot,
} from "@game/data";

import { equipSeal, isHydrated, unequipSlot, useGameSave } from "@/lib/gameStore";

/** As 7 categorias de equipamento, na ordem do GDD. */
const SLOTS: EquipmentSlot[] = [
  "Arma",
  "Armadura",
  "Escudo",
  "Capa",
  "Sapato",
  "Acessório",
  "Elmo",
];

export function EquipmentScreen() {
  const save = useGameSave();

  if (!isHydrated()) {
    return (
      <main className="p-6 text-sm text-neutral-400">
        Carregando seus Selos…
      </main>
    );
  }

  const ownedSeals: BattleSeal[] = Object.keys(save.sealFragments)
    .map((id) => BATTLE_SEALS_BY_ID.get(id))
    .filter((s): s is BattleSeal => Boolean(s));

  const bySlot = new Map<EquipmentSlot, BattleSeal[]>();
  for (const seal of ownedSeals) {
    const list = bySlot.get(seal.equipmentSlot) ?? [];
    list.push(seal);
    bySlot.set(seal.equipmentSlot, list);
  }

  const totalEquipped = Object.keys(save.equippedSeals).length;

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-bold">Selos de Batalha</h1>
        <p className="text-xs text-neutral-500">
          Um Selo ativo por categoria. Você possui {ownedSeals.length} Selo(s) ·{" "}
          {totalEquipped} equipado(s). Os status na tela de Combate já
          consideram os Selos equipados.
        </p>
      </header>

      {ownedSeals.length === 0 ? (
        <p className="rounded border border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800">
          Você ainda não possui nenhum Selo. Forje alguns em{" "}
          <strong>Invocar → Forjar Selo</strong> ou derrote monstros para dropar
          fragmentos.
        </p>
      ) : null}

      <div className="space-y-3">
        {SLOTS.map((slot) => {
          const equippedId = save.equippedSeals[slot];
          const equipped = equippedId
            ? BATTLE_SEALS_BY_ID.get(equippedId)
            : undefined;
          const options = bySlot.get(slot) ?? [];

          return (
            <section
              key={slot}
              className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                  {slot}{" "}
                  <span className="text-xs font-normal text-neutral-400">
                    {equipped ? `· ${equipped.name}` : "· vazio"}
                  </span>
                </h2>
                {equipped ? (
                  <button
                    type="button"
                    onClick={() => unequipSlot(slot)}
                    className="rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
                  >
                    Desequipar
                  </button>
                ) : null}
              </div>

              {options.length === 0 ? (
                <p className="mt-2 text-xs text-neutral-400">
                  Nenhum Selo desta categoria no inventário.
                </p>
              ) : (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {options.map((seal) => {
                    const isEquipped = seal.id === equippedId;
                    return (
                      <li
                        key={seal.id}
                        className={`rounded border p-3 text-sm ${
                          isEquipped
                            ? "border-blue-500 bg-blue-500/5"
                            : "border-neutral-200 dark:border-neutral-800"
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium">{seal.name}</span>
                          <span className="text-[10px] uppercase tracking-wide text-neutral-400">
                            {seal.rarity}
                          </span>
                        </div>
                        <p className="mt-1 text-xs">
                          <span className="text-neutral-400">Efeito: </span>
                          {seal.mainEffect}
                        </p>
                        <p className="text-xs">
                          <span className="text-neutral-400">Compêndio: </span>
                          {seal.collectionBonus}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[11px] text-neutral-400">
                            Fragmentos: {save.sealFragments[seal.id] ?? 0}
                          </span>
                          {isEquipped ? (
                            <span className="text-xs font-medium text-blue-600">
                              Equipado
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => equipSeal(slot, seal.id)}
                              className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white"
                            >
                              Equipar
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}

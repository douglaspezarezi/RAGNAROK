"use client";

import { useState } from "react";

import {
  getRebirthCount,
  getRebirthMultiplier,
  REBIRTH_GLOBAL_BONUS_PER_REBIRTH,
  type CharacterState,
} from "@game/core";

import { doRebirth } from "@/lib/gameStore";
import { toast } from "@/lib/toast";

export function RebirthModal({
  character,
  onClose,
}: {
  character: CharacterState;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const count = getRebirthCount(character);
  const currentMult = getRebirthMultiplier(character);
  const nextMult = 1 + (count + 1) * REBIRTH_GLOBAL_BONUS_PER_REBIRTH;
  const bonusPct = Math.round(REBIRTH_GLOBAL_BONUS_PER_REBIRTH * 100);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await doRebirth();
      if (r.ok) {
        toast.success(
          `Renascimento concluído! Multiplicador global agora ×${nextMult.toFixed(2)}.`,
        );
        onClose();
      } else {
        toast.error(r.error ?? "Falha no renascimento.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar renascimento"
    >
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="text-lg font-bold">Renascer (Prestígio)</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Troca o progresso atual por um bônus permanente. Não dá pra desfazer.
        </p>

        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded border border-red-500/40 bg-red-500/5 p-3">
            <p className="font-semibold text-red-600 dark:text-red-400">
              Você perde
            </p>
            <ul className="mt-1 list-disc pl-5 text-xs">
              <li>Nível {character.level} → 1</li>
              <li>Estágio atual → volta ao Capítulo 1</li>
              <li>Progresso de capítulos concluídos</li>
            </ul>
          </div>

          <div className="rounded border border-emerald-500/40 bg-emerald-500/5 p-3">
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">
              Você mantém
            </p>
            <ul className="mt-1 list-disc pl-5 text-xs">
              <li>Companheiros e seus fragmentos</li>
              <li>Selos (inclusive os equipados)</li>
              <li>Cristais de Invocação e pity</li>
              <li>Conquistas</li>
            </ul>
          </div>

          <div className="rounded border border-neutral-200 p-3 dark:border-neutral-800">
            <p className="font-semibold">Multiplicador global (XP e ouro)</p>
            <p className="mt-1 text-xs">
              Atual: <strong>×{currentMult.toFixed(2)}</strong> → depois do
              renascimento: <strong>×{nextMult.toFixed(2)}</strong>{" "}
              <span className="text-neutral-400">
                (+{bonusPct}% por renascimento)
              </span>
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Renascimentos: {count} → {count + 1}
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Renascendo…" : "Confirmar renascimento"}
          </button>
        </div>
      </div>
    </div>
  );
}

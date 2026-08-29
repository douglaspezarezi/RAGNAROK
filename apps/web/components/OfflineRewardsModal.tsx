"use client";

import type { OfflineRewardsSummary } from "@game/core";

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min`;
  return `${total}s`;
}

export function OfflineRewardsModal({
  summary,
  onClose,
}: {
  summary: OfflineRewardsSummary;
  onClose: () => void;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Tempo fora", value: formatDuration(summary.offlineSecondsRequested) },
    {
      label: "Tempo creditado",
      value: `${formatDuration(summary.offlineSecondsCredited)}${
        summary.wasCapped ? ` (teto de ${summary.capHours}h)` : ""
      }`,
    },
    { label: "Kills estimados", value: String(summary.estimatedKills) },
    { label: "XP", value: `+${summary.xp}` },
    { label: "Ouro", value: `+${summary.gold}` },
  ];
  if (summary.sealFragments && summary.sealFragments.amount > 0) {
    rows.push({
      label: "Fragmentos de Selo",
      value: `+${summary.sealFragments.amount} (${summary.sealFragments.sealId})`,
    });
  }
  if (summary.companionFragments && summary.companionFragments.amount > 0) {
    rows.push({
      label: "Fragmentos de Companheiro",
      value: `+${summary.companionFragments.amount} (${summary.companionFragments.companionId})`,
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Recompensas offline"
    >
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="text-lg font-bold">Enquanto você esteve fora…</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Seu personagem continuou farmando no último estágio (eficiência de{" "}
          {Math.round(summary.efficiencyFactor * 100)}%).
        </p>

        <dl className="mt-4 divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between py-1.5">
              <dt className="text-neutral-500">{r.label}</dt>
              <dd className="font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

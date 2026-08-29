"use client";

import { useState } from "react";

import {
  BATTLE_SEALS_BY_ID,
  COMPANIONS_BY_ID,
  type CompanionTier,
} from "@game/data";
import {
  PITY_THRESHOLD,
  type BannerType,
  type SummonResult,
} from "@game/core";

import {
  isHydrated,
  performSummon,
  SUMMON_COST,
  useGameSave,
} from "@/lib/gameStore";
import { toast } from "@/lib/toast";

const TIER_STYLE: Record<CompanionTier, string> = {
  S: "bg-amber-500/20 text-amber-500",
  A: "bg-fuchsia-500/20 text-fuchsia-500",
  B: "bg-sky-500/20 text-sky-500",
  C: "bg-neutral-500/20 text-neutral-400",
};

function itemName(res: SummonResult): string {
  if (res.itemKind === "companion") {
    return COMPANIONS_BY_ID.get(res.itemId)?.name ?? res.itemId;
  }
  return BATTLE_SEALS_BY_ID.get(res.itemId)?.name ?? res.itemId;
}

export function SummonScreen() {
  const save = useGameSave();

  if (!isHydrated()) {
    return (
      <main className="p-6 text-sm text-neutral-400">Carregando invocação…</main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">Invocação</h1>
        <span className="text-sm">
          Cristais de Invocação:{" "}
          <strong>{save.summonCrystals.toLocaleString("pt-BR")}</strong> 💎
        </span>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Banner
          banner="companion"
          title="Convocar Companheiro"
          subtitle="Companheiros dos tiers S/A/B/C. Duplicata vira fragmentos de evolução."
          pity={save.summonPity.companion}
          crystals={save.summonCrystals}
        />
        <Banner
          banner="seal"
          title="Forjar Selo"
          subtitle="Selos por raridade. Duplicata vira Essência de Selo (fragmentos)."
          pity={save.summonPity.seal}
          crystals={save.summonCrystals}
        />
      </div>
    </main>
  );
}

function Banner({
  banner,
  title,
  subtitle,
  pity,
  crystals,
}: {
  banner: BannerType;
  title: string;
  subtitle: string;
  pity: number;
  crystals: number;
}) {
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<SummonResult[] | null>(null);
  const [revealKey, setRevealKey] = useState(0);

  async function roll(count: 1 | 10) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await performSummon(banner, count);
      if (!r.ok) {
        toast.error(r.error ?? "Falha na invocação.");
        return;
      }
      setResults(r.results ?? []);
      setRevealKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  const pityPct = Math.min(100, (pity / PITY_THRESHOLD) * 100);

  return (
    <section className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-neutral-500">{subtitle}</p>
      </div>

      <div>
        <p className="text-xs text-neutral-500">
          Pity: <strong>{pity}</strong>/{PITY_THRESHOLD} até garantia de Tier S
        </p>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className="h-full bg-amber-500 transition-[width] duration-300"
            style={{ width: `${pityPct}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || crystals < SUMMON_COST.single}
          onClick={() => roll(1)}
          className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Invocar 1x ({SUMMON_COST.single} 💎)
        </button>
        <button
          type="button"
          disabled={busy || crystals < SUMMON_COST.ten}
          onClick={() => roll(10)}
          className="flex-1 rounded bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Invocar 10x ({SUMMON_COST.ten} 💎)
        </button>
      </div>

      {busy ? (
        <p className="text-xs text-neutral-400">Invocando…</p>
      ) : null}

      {results && results.length > 0 ? (
        <ul key={revealKey} className="grid grid-cols-2 gap-2">
          {results.map((res, i) => (
            <li
              key={i}
              className="rk-reveal rounded border border-neutral-200 p-2 text-xs dark:border-neutral-800"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${TIER_STYLE[res.tier]}`}
                >
                  {res.tier}
                </span>
                {res.guaranteedByPity ? (
                  <span className="text-[9px] font-bold uppercase text-amber-500">
                    garantido
                  </span>
                ) : null}
              </div>
              <p className="mt-1 font-medium">{itemName(res)}</p>
              <p className="text-[11px] text-neutral-400">
                {res.outcome === "new"
                  ? "✨ NOVO!"
                  : `+${res.fragmentsAwarded} ${
                      banner === "companion" ? "fragmentos" : "Essência de Selo"
                    }`}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

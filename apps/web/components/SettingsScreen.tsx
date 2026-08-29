"use client";

import { useEffect, useState } from "react";

import {
  flushSaves,
  getMeta,
  isHydrated,
  saveNow,
  stopAutosave,
} from "@/lib/gameStore";
import {
  COMBAT_TICK_MS,
  updateSetting,
  useSettings,
  type PlayerSettings,
} from "@/lib/settings";
import { getSupabase } from "@/lib/supabase/client";
import { reopenTutorial } from "@/lib/tutorial";

export function SettingsScreen() {
  const settings = useSettings();
  const [account, setAccount] = useState<{
    email: string | null;
    characterCreatedAt: string | null;
  }>({ email: null, characterCreatedAt: null });
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!isHydrated()) return;
    let cancelled = false;
    void (async () => {
      const supabase = getSupabase();
      const meta = getMeta();
      const [{ data: userData }, charRes] = await Promise.all([
        supabase.auth.getUser(),
        meta
          ? supabase
              .from("characters")
              .select("created_at")
              .eq("id", meta.characterId)
              .single()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (cancelled) return;
      setAccount({
        email: userData.user?.email ?? null,
        characterCreatedAt:
          (charRes.data as { created_at?: string } | null)?.created_at ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await saveNow();
      await flushSaves();
      stopAutosave();
      await getSupabase().auth.signOut();
      // o AppShell reage ao evento SIGNED_OUT e volta para a tela de login
    } finally {
      setSigningOut(false);
    }
  }

  if (!isHydrated()) {
    return (
      <main className="p-6 text-sm text-neutral-400">
        Carregando configurações…
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-bold">Configurações</h1>
        <p className="text-xs text-neutral-500">
          Preferências salvas na sua conta.
        </p>
      </header>

      {/* ---- Preferências ---- */}
      <section className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-semibold">Preferências</h2>

        <Toggle
          label="Som"
          hint="Efeitos sonoros (áudio ainda não implementado)."
          checked={settings.sound}
          onChange={(v) => updateSetting("sound", v)}
        />
        <Toggle
          label="Música"
          hint="Trilha de fundo (áudio ainda não implementado)."
          checked={settings.music}
          onChange={(v) => updateSetting("music", v)}
        />

        <div className="pt-1">
          <p className="text-sm font-medium">Velocidade de combate</p>
          <p className="text-xs text-neutral-500">
            Afeta o intervalo do loop na tela de Combate.
          </p>
          <div className="mt-2 flex gap-2">
            {(["normal", "fast"] as PlayerSettings["combatSpeed"][]).map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => updateSetting("combatSpeed", sp)}
                className={`rounded border px-3 py-1.5 text-sm ${
                  settings.combatSpeed === sp
                    ? "border-blue-500 bg-blue-500/10 font-medium text-blue-600 dark:text-blue-400"
                    : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                {sp === "normal" ? "Normal" : "Rápido"}{" "}
                <span className="text-[10px] text-neutral-400">
                  ({COMBAT_TICK_MS[sp]}ms)
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Tutorial ---- */}
      <section className="space-y-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-semibold">Tutorial</h2>
        <p className="text-xs text-neutral-500">
          Reabra a sequência de introdução quando quiser.
        </p>
        <button
          type="button"
          onClick={() => reopenTutorial()}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          Rever tutorial
        </button>
      </section>

      {/* ---- Conta ---- */}
      <section className="space-y-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-semibold">Conta</h2>
        <dl className="divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
          <div className="flex justify-between py-1.5">
            <dt className="text-neutral-500">E-mail</dt>
            <dd className="font-medium">{account.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between py-1.5">
            <dt className="text-neutral-500">Personagem criado em</dt>
            <dd className="font-medium">
              {account.characterCreatedAt
                ? new Date(account.characterCreatedAt).toLocaleDateString(
                    "pt-BR",
                    { day: "2-digit", month: "2-digit", year: "numeric" },
                  )
                : "—"}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={signingOut}
          className="mt-2 rounded border border-red-500/50 px-3 py-1.5 text-sm text-red-600 disabled:opacity-40 dark:text-red-400"
        >
          {signingOut ? "Saindo…" : "Sair da conta"}
        </button>
      </section>
    </main>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint ? (
          <span className="block text-xs text-neutral-500">{hint}</span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-neutral-300 dark:bg-neutral-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
